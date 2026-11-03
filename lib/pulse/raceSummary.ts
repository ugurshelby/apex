/**
 * Race summary from the official classification (Faz 21.0): where the winner
 * started, what became of the pole sitter, fastest lap, biggest gain and the
 * drivers who did not finish. Pure; input is `getRaceResultRows` output.
 */

import type { RaceResultRow } from '@/lib/f1/mrdata';

export interface SummaryDriver {
  driverName: string;
  driverId?: string;
  constructorName: string;
}

export interface RaceSummary {
  winner: SummaryDriver & { grid: number | null };
  /** Pole sitter when they did not win. */
  poleSitter: (SummaryDriver & { position: number | null; finished: boolean }) | null;
  fastestLap: SummaryDriver | null;
  /** Largest grid-to-finish gain among classified finishers (at least 3 places). */
  biggestGain: (SummaryDriver & { grid: number; position: number; gain: number }) | null;
  dnf: SummaryDriver[];
}

/** Jolpica statuses for a car that took the flag: "Finished", "Lapped", "+1 Lap", "+2 Laps". */
export function isFinisher(status: string | null): boolean {
  if (!status) return true;
  return status === 'Finished' || status === 'Lapped' || /^\+\d+ Laps?$/.test(status);
}

const MIN_GAIN = 3;

function num(v: string | null | undefined): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function who(r: RaceResultRow): SummaryDriver {
  return { driverName: r.driverName, driverId: r.driverId, constructorName: r.constructorName };
}

export function buildRaceSummary(rows: readonly RaceResultRow[]): RaceSummary | null {
  const winnerRow = rows.find((r) => num(r.position) === 1);
  if (!winnerRow) return null;

  const poleRow = rows.find((r) => num(r.grid) === 1);
  const fastestRow = rows.find((r) => r.fastestLap);

  let biggestGain: RaceSummary['biggestGain'] = null;
  for (const r of rows) {
    // Grid 0 is a pit-lane start: no grid slot to measure a gain from.
    const grid = num(r.grid);
    const position = num(r.position);
    if (grid === null || position === null || !isFinisher(r.status)) continue;
    const gain = grid - position;
    if (gain >= MIN_GAIN && (!biggestGain || gain > biggestGain.gain)) biggestGain = { ...who(r), grid, position, gain };
  }

  return {
    winner: { ...who(winnerRow), grid: num(winnerRow.grid) },
    poleSitter:
      poleRow && poleRow !== winnerRow
        ? { ...who(poleRow), position: num(poleRow.position), finished: isFinisher(poleRow.status) }
        : null,
    fastestLap: fastestRow ? who(fastestRow) : null,
    biggestGain,
    dnf: rows.filter((r) => !isFinisher(r.status)).map(who),
  };
}
