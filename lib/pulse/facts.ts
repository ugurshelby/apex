/**
 * Race fact extractor (Faz 21.2). Pure: turns the official classification, the
 * OpenF1 race control snapshot and the lap-by-lap running order into plain
 * facts (safety cars, red flag, penalties, incidents, lead changes). Every
 * fact is read from a row or a message; nothing is inferred. The narrator
 * (Faz 21.5) may only retell what is in here.
 */

import type { LapPositionsSnapshot, RaceControlMessage, RaceControlSnapshot } from '@/lib/f1/raceEvents';
import type { RaceResultRow } from '@/lib/f1/mrdata';
import { buildRaceSummary, isFinisher, type RaceSummary } from '@/lib/pulse/raceSummary';

export interface FactDriver {
  /** Three-letter code, upper case ("HAM"). */
  code: string;
  name: string;
  constructorName: string | null;
}

export interface Neutralisation {
  kind: 'safety_car' | 'vsc' | 'red_flag';
  startLap: number | null;
  /** Lap it ended on (red flag: the lap the race restarted); null while still open. */
  endLap: number | null;
}

export interface PenaltyFact {
  driver: FactDriver;
  kind: 'time' | 'drive_through' | 'stop_go';
  /** Seconds for time and stop-go penalties. */
  seconds: number | null;
  reason: string | null;
  issuedLap: number | null;
  servedLap: number | null;
  /** Issued after the chequered flag. */
  postRace: boolean;
}

export type IncidentOutcome = 'noted' | 'investigating' | 'penalty' | 'no_action' | 'after_race';

export interface IncidentFact {
  lap: number | null;
  turn: number | null;
  drivers: FactDriver[];
  cause: string | null;
  outcome: IncidentOutcome;
  /** Two cars of one team in the same incident. */
  teammates: boolean;
}

export interface Retirement {
  driver: FactDriver;
  status: string;
  lapsCompleted: number | null;
}

export interface LeadChange {
  /** Lap at whose end the new leader was in front (1-based). */
  lap: number;
  from: FactDriver;
  to: FactDriver;
}

export interface RaceFacts {
  summary: RaceSummary | null;
  retirements: Retirement[];
  neutralisations: Neutralisation[];
  penalties: PenaltyFact[];
  incidents: IncidentFact[];
  leadChanges: LeadChange[];
  /** Laps led per driver, most first. Empty without lap positions. */
  lapsLed: { driver: FactDriver; laps: number }[];
}

const TIME_KEY_RE = /\((\d{2}:\d{2}:\d{2})\)\s*$/;
const CODE_RE = /\d+ \(([A-Z]{3})\)/g;
const TURN_RE = /TURN (\d+) INCIDENT/;
const PENALTY_RE = /^(?:(\d+) SECOND (TIME|STOP\/GO)|DRIVE THROUGH) PENALTY FOR CAR \d+ \(([A-Z]{3})\)$/;
/** Stewards' wording, most specific first; the text after " - " is the cause. */
const STATUSES: readonly [string, IncidentOutcome][] = [
  ['REVIEWED NO FURTHER INVESTIGATION', 'no_action'],
  ['NO FURTHER ACTION', 'no_action'],
  ['WILL BE INVESTIGATED AFTER THE RACE', 'after_race'],
  ['UNDER INVESTIGATION', 'investigating'],
  ['NOTED', 'noted'],
];

function rosterOf(rows: readonly RaceResultRow[], lapPositions: LapPositionsSnapshot | null): Map<string, FactDriver> {
  const roster = new Map<string, FactDriver>();
  for (const r of rows) {
    const code = r.driverCode.toUpperCase();
    if (code) roster.set(code, { code, name: r.driverName, constructorName: r.constructorName });
  }
  for (const d of lapPositions?.drivers ?? []) {
    if (d.code && !roster.has(d.code)) roster.set(d.code, { code: d.code, name: d.code, constructorName: null });
  }
  return roster;
}

function neutralisationsOf(messages: readonly RaceControlMessage[]): Neutralisation[] {
  const out: Neutralisation[] = [];
  let sc: Neutralisation | null = null;
  let vsc: Neutralisation | null = null;
  let red: Neutralisation | null = null;
  const open = (kind: Neutralisation['kind'], lap: number | null) => {
    const n: Neutralisation = { kind, startLap: lap, endLap: null };
    out.push(n);
    return n;
  };
  for (const m of messages) {
    const text = m.message;
    if (m.category === 'SafetyCar') {
      if (/^SAFETY CAR DEPLOYED/.test(text)) sc = open('safety_car', m.lap);
      else if (/^SAFETY CAR IN THIS LAP/.test(text) && sc) {
        sc.endLap = m.lap;
        sc = null;
      } else if (/^VSC DEPLOYED/.test(text)) vsc = open('vsc', m.lap);
      else if (/^VSC ENDING/.test(text) && vsc) {
        vsc.endLap = m.lap;
        vsc = null;
      }
    } else if (/^RED FLAG/.test(text)) {
      // The red flag ends a running safety car period.
      if (sc) {
        sc.endLap = m.lap;
        sc = null;
      }
      red = open('red_flag', m.lap);
    } else if (red && (/^(STANDING|ROLLING) START/.test(text) || (m.category === 'SessionStatus' && text === 'SESSION STARTED'))) {
      red.endLap = m.lap;
      red = null;
    }
  }
  return out;
}


function stewardsOf(
  snapshot: RaceControlSnapshot,
  roster: Map<string, FactDriver>,
): { penalties: PenaltyFact[]; incidents: IncidentFact[] } {
  const who = (code: string): FactDriver => roster.get(code) ?? { code, name: code, constructorName: null };
  const end = Date.parse(snapshot.sessionEnd);
  const incidents = new Map<string, IncidentFact>();
  const penalties = new Map<string, PenaltyFact>();

  for (const m of snapshot.messages) {
    const body = m.message.replace(/^FIA STEWARDS: /, '');
    const timed = TIME_KEY_RE.exec(body);
    if (!timed) continue;
    // Stewards tag every case with the time it happened; that links notes, decisions and penalties.
    const key = timed[1];
    const rest = body.slice(0, timed.index).trim();
    const codes = [...rest.matchAll(CODE_RE)].map((c) => c[1]);

    if (rest.startsWith('PENALTY SERVED - ')) {
      const served = penalties.get(`${key}|${codes[0]}`);
      if (served) served.servedLap = m.lap;
      continue;
    }

    const sep = rest.indexOf(' - ');
    const pen = PENALTY_RE.exec(sep < 0 ? rest : rest.slice(0, sep));
    if (pen) {
      const code = pen[3];
      const reason = sep < 0 ? null : rest.slice(sep + 3);
      penalties.set(`${key}|${code}`, {
        driver: who(code),
        kind: pen[2] === 'TIME' ? 'time' : pen[2] === 'STOP/GO' ? 'stop_go' : 'drive_through',
        seconds: pen[1] ? Number(pen[1]) : null,
        reason,
        issuedLap: m.lap,
        servedLap: null,
        postRace: Number.isFinite(end) && Date.parse(m.date) > end,
      });
      const draft = incidents.get(key);
      if (draft) {
        draft.outcome = 'penalty';
        draft.cause ??= reason;
      } else {
        incidents.set(key, { lap: m.lap, turn: null, drivers: [who(code)], cause: reason, outcome: 'penalty', teammates: false });
      }
      continue;
    }

    const status = STATUSES.find(([phrase]) => rest.includes(phrase));
    if (!status || codes.length === 0) continue;
    const [phrase, outcome] = status;
    const tail = rest.slice(rest.indexOf(phrase) + phrase.length);
    const cause = tail.startsWith(' - ') ? tail.slice(3) : null;
    const existing = incidents.get(key);
    if (existing) {
      // A penalty is the final word; other messages only move the case forward.
      if (existing.outcome !== 'penalty') existing.outcome = outcome;
      existing.cause ??= cause;
      continue;
    }
    const drivers = codes.slice(0, 2).map(who);
    const turn = TURN_RE.exec(rest)?.[1];
    incidents.set(key, {
      lap: m.lap,
      turn: turn ? Number(turn) : null,
      drivers,
      cause,
      outcome,
      teammates: drivers.length === 2 && !!drivers[0]?.constructorName && drivers[0].constructorName === drivers[1]?.constructorName,
    });
  }

  return { penalties: [...penalties.values()], incidents: [...incidents.values()] };
}

function leadFactsOf(
  lapPositions: LapPositionsSnapshot,
  roster: Map<string, FactDriver>,
): { leadChanges: LeadChange[]; lapsLed: RaceFacts['lapsLed'] } {
  const who = (code: string): FactDriver => roster.get(code) ?? { code, name: code, constructorName: null };
  const withCode = lapPositions.drivers.filter((d): d is typeof d & { code: string } => !!d.code);
  const poleCode = withCode.find((d) => d.grid === 1)?.code ?? null;
  const counts = new Map<string, number>();
  const leadChanges: LeadChange[] = [];
  let leader = poleCode;
  for (let i = 0; i < lapPositions.laps; i++) {
    const code = withCode.find((d) => d.positions.at(i) === 1)?.code;
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
    if (leader && code !== leader) leadChanges.push({ lap: i + 1, from: who(leader), to: who(code) });
    leader = code;
  }
  const lapsLed = [...counts].sort((a, b) => b[1] - a[1]).map(([code, laps]) => ({ driver: who(code), laps }));
  return { leadChanges, lapsLed };
}

export function buildRaceFacts(opts: {
  rows: readonly RaceResultRow[];
  raceControl: RaceControlSnapshot | null;
  lapPositions: LapPositionsSnapshot | null;
}): RaceFacts {
  const { rows, raceControl, lapPositions } = opts;
  const roster = rosterOf(rows, lapPositions);

  const retirements: Retirement[] = rows
    .filter((r) => !isFinisher(r.status))
    .map((r) => {
      const laps = Number(r.laps);
      return {
        driver: roster.get(r.driverCode.toUpperCase()) ?? { code: r.driverCode.toUpperCase(), name: r.driverName, constructorName: r.constructorName },
        status: r.status ?? 'Retired',
        lapsCompleted: Number.isFinite(laps) && r.laps ? laps : null,
      };
    });

  const steward = raceControl ? stewardsOf(raceControl, roster) : { penalties: [], incidents: [] };
  const lead = lapPositions ? leadFactsOf(lapPositions, roster) : { leadChanges: [], lapsLed: [] };

  return {
    summary: buildRaceSummary(rows),
    retirements,
    neutralisations: raceControl ? neutralisationsOf(raceControl.messages) : [],
    penalties: steward.penalties,
    incidents: steward.incidents,
    leadChanges: lead.leadChanges,
    lapsLed: lead.lapsLed,
  };
}
