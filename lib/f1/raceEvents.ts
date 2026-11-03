/**
 * Race events snapshots (Faz 21.1), built from OpenF1 after a race:
 * - `race_control`: the race control messages (flags, safety car, red flag,
 *   stewards' investigations and penalties), trimmed to the fields the fact
 *   extractor (Faz 21.2) reads. Blue flags are dropped: dozens per race, no story.
 * - `lap_positions`: each driver's running order at the end of every lap and on
 *   the grid, derived from OpenF1 `position` changes and `laps` start times.
 * Pure functions; lib/f1/raceEventsSync.ts fetches and writes them.
 */

import type { OpenF1Driver, OpenF1Lap, OpenF1Position, OpenF1RaceControl } from '@/lib/f1/sources/openf1';

export interface RaceControlMessage {
  date: string;
  lap: number | null;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driverNumber: number | null;
  message: string;
}

export interface RaceControlSnapshot {
  season: number;
  round: number;
  sessionKey: number;
  /** Session end (UTC ISO): messages after it are post-race decisions. */
  sessionEnd: string;
  messages: RaceControlMessage[];
}

export interface DriverLapPositions {
  driverNumber: number;
  /** Three-letter code from the OpenF1 roster, when known. */
  code: string | null;
  /** Grid slot (position before the first lap started), null when unknown. */
  grid: number | null;
  /** positions[i] = running order at the end of lap i + 1; stops at the last lap the driver completed. */
  positions: number[];
}

export interface LapPositionsSnapshot {
  season: number;
  round: number;
  sessionKey: number;
  laps: number;
  drivers: DriverLapPositions[];
}

export function buildRaceControlSnapshot(opts: {
  season: number;
  round: number;
  sessionKey: number;
  sessionEnd: string;
  messages: readonly OpenF1RaceControl[];
}): RaceControlSnapshot | null {
  const messages = opts.messages
    .filter((m) => m.session_key === opts.sessionKey && m.flag !== 'BLUE' && m.message)
    .map((m) => ({
      date: m.date,
      lap: m.lap_number,
      category: m.category,
      flag: m.flag,
      scope: m.scope,
      sector: m.sector,
      driverNumber: m.driver_number,
      message: m.message,
    }))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (messages.length === 0) return null;
  return { season: opts.season, round: opts.round, sessionKey: opts.sessionKey, sessionEnd: opts.sessionEnd, messages };
}

/** Last known position of each driver at or before `t` (ms), from a date-sorted change list. */
function positionAt(changes: readonly { t: number; position: number }[], t: number): number | null {
  let pos: number | null = null;
  for (const c of changes) {
    if (c.t > t) break;
    pos = c.position;
  }
  return pos;
}

export function buildLapPositions(opts: {
  season: number;
  round: number;
  sessionKey: number;
  positions: readonly OpenF1Position[];
  laps: readonly OpenF1Lap[];
  roster?: readonly OpenF1Driver[];
}): LapPositionsSnapshot | null {
  const changes = new Map<number, { t: number; position: number }[]>();
  for (const p of opts.positions) {
    const t = Date.parse(p.date);
    if (!Number.isFinite(t) || !p.position) continue;
    const list = changes.get(p.driver_number) ?? [];
    list.push({ t, position: p.position });
    changes.set(p.driver_number, list);
  }
  for (const list of changes.values()) list.sort((a, b) => a.t - b.t);

  const lapsByDriver = new Map<number, Map<number, OpenF1Lap>>();
  for (const l of opts.laps) {
    const m = lapsByDriver.get(l.driver_number) ?? new Map<number, OpenF1Lap>();
    m.set(l.lap_number, l);
    lapsByDriver.set(l.driver_number, m);
  }
  if (lapsByDriver.size === 0 || changes.size === 0) return null;

  // A lap ends when the same driver starts the next one (so lapped cars are read on their own laps);
  // the last lap ends at its start plus its duration.
  const codes = new Map((opts.roster ?? []).map((d) => [d.driver_number, d.name_acronym || null]));
  const drivers: DriverLapPositions[] = [];
  let maxLaps = 0;

  for (const [driverNumber, laps] of lapsByDriver) {
    const list = changes.get(driverNumber) ?? [];
    const numbers = [...laps.keys()].sort((a, b) => a - b);
    const lastLap = numbers.at(-1) ?? 0;
    const first = laps.get(1);
    const firstStart = first?.date_start ? Date.parse(first.date_start) : NaN;
    const positions: number[] = [];
    for (let n = 1; n <= lastLap; n++) {
      const lap = laps.get(n);
      const next = laps.get(n + 1);
      let end = next?.date_start ? Date.parse(next.date_start) : NaN;
      if (!Number.isFinite(end) && lap?.date_start && lap.lap_duration) end = Date.parse(lap.date_start) + lap.lap_duration * 1000;
      const pos = Number.isFinite(end) ? positionAt(list, end) : null;
      if (pos === null) break; // a gap in the timing data: stop rather than guess
      positions.push(pos);
    }
    // Grid: OpenF1 publishes the starting order before lap 1; a car with no lap-1 start time falls back to its first change.
    const grid = Number.isFinite(firstStart) ? positionAt(list, firstStart) : (list[0]?.position ?? null);
    maxLaps = Math.max(maxLaps, positions.length);
    drivers.push({ driverNumber, code: codes.get(driverNumber) ?? null, grid, positions });
  }

  // Running order at the end: more laps first, then the last position held.
  drivers.sort((a, b) => b.positions.length - a.positions.length || (a.positions.at(-1) ?? 99) - (b.positions.at(-1) ?? 99));
  return { season: opts.season, round: opts.round, sessionKey: opts.sessionKey, laps: maxLaps, drivers };
}
