/**
 * Milestone finder (Faz 21.3): compares one race's outcome with the history
 * index (data/records/index.json, built by scripts/build-records-index.ts) and
 * with the live season so far, and lists what was historic about it. Pure; the
 * caller (race story builder, Faz 21.4) supplies the counts before the race.
 *
 * Every milestone is computed, never phrased: the narrator (Faz 21.5) turns
 * them into words and may only use these facts.
 */

import { ageOn, compareChampionAge, type Age, type ChampionRecord, type TitleDecider } from '@/lib/pulse/championship';

/** Career counts of one driver (index rows: up to the end of the indexed seasons). */
export interface CareerCounts {
  starts: number;
  wins: number;
  poles: number;
  podiums: number;
  /** Races and sprints with points. */
  scores: number;
}

export interface IndexedDriver extends CareerCounts {
  id: string;
  name: string;
  lastName: string;
  dateOfBirth: string;
}

export interface RecordWinner {
  name: string;
  dateOfBirth: string;
  season: number;
  round: number;
  date: string;
}

export interface RecordsIndex {
  throughSeason: number;
  winners: { youngest: RecordWinner | null; oldest: RecordWinner | null };
  seasonMostWins: { wins: number; season: number; name: string };
  champions: ChampionRecord[];
  drivers: IndexedDriver[];
}

export const EMPTY_COUNTS: CareerCounts = { starts: 0, wins: 0, poles: 0, podiums: 0, scores: 0 };

function normalise(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Index row for a live driver: Jolpica and F1DB ids differ ("antonelli" vs
 * "kimi-antonelli"), so the match is birth date + family name. Null for a
 * driver with no race before the indexed seasons ended (a rookie).
 */
export function findIndexedDriver(index: RecordsIndex, dateOfBirth: string, familyName: string): IndexedDriver | null {
  const key = normalise(familyName);
  return index.drivers.find((d) => d.dateOfBirth === dateOfBirth && normalise(d.lastName) === key) ?? null;
}

export type Milestone =
  | { kind: 'champion'; driverId: string; season: number; round: number }
  | { kind: 'youngest-champion'; driverId: string; age: Age; previous: { name: string; season: number; age: Age } | null }
  | { kind: 'oldest-champion'; driverId: string; age: Age; previous: { name: string; season: number; age: Age } | null }
  | { kind: 'first-win' | 'first-pole' | 'first-podium' | 'first-points'; driverId: string }
  | { kind: 'season-wins'; driverId: string; count: number; record: 'new' | 'equal' | null }
  | { kind: 'win-streak'; driverId: string; count: number }
  | { kind: 'youngest-winner' | 'oldest-winner'; driverId: string; age: Age; previous: { name: string; season: number; age: Age } | null };

/** One driver's line in the race being examined. */
export interface RaceOutcome {
  driverId: string;
  name: string;
  /** Classified position; null when not classified. */
  position: number | null;
  pole: boolean;
  /** Points from this Grand Prix and, on a sprint weekend, its sprint. */
  points: number;
  dateOfBirth?: string;
  /** Career counts before this race (index counts + the live season's earlier rounds). */
  before: CareerCounts;
  /** Grand Prix wins this season before this race. */
  seasonWinsBefore: number;
  /** Consecutive Grand Prix wins up to the previous race. */
  streakBefore: number;
}

/** A win streak this long or longer is worth a line. */
export const STREAK_MIN = 3;

function ageKey(a: Age): number {
  return a.years * 400 + a.days;
}

export function detectRaceMilestones(opts: {
  season: number;
  round: number;
  date: string;
  outcomes: readonly RaceOutcome[];
  index: RecordsIndex;
  /** The title decider when it was settled at this round. */
  decider?: TitleDecider | null;
}): Milestone[] {
  const { season, round, date, outcomes, index } = opts;
  const out: Milestone[] = [];

  const decider = opts.decider && opts.decider.round === round ? opts.decider : null;
  if (decider) {
    out.push({ kind: 'champion', driverId: decider.championId, season, round });
    const champ = outcomes.find((o) => o.driverId === decider.championId);
    if (champ?.dateOfBirth) {
      const age = ageOn(champ.dateOfBirth, decider.date);
      const earlier = index.champions.filter((c) => c.season < season);
      const cmp = compareChampionAge(season, champ.name, age, earlier);
      if (cmp.rank === 1) {
        const p = cmp.previousYoungest;
        out.push({ kind: 'youngest-champion', driverId: champ.driverId, age, previous: p ? { name: p.name, season: p.season, age: p.age } : null });
      }
      const oldest = earlier
        .map((c) => ({ name: c.name, season: c.season, age: ageOn(c.dateOfBirth, c.decidedDate) }))
        .sort((a, b) => ageKey(b.age) - ageKey(a.age))[0];
      if (!oldest || ageKey(age) > ageKey(oldest.age)) {
        out.push({ kind: 'oldest-champion', driverId: champ.driverId, age, previous: oldest ?? null });
      }
    }
  }

  for (const o of outcomes) {
    if (o.position === 1 && o.before.wins === 0) out.push({ kind: 'first-win', driverId: o.driverId });
    if (o.pole && o.before.poles === 0) out.push({ kind: 'first-pole', driverId: o.driverId });
    if (o.position !== null && o.position <= 3 && o.position > 1 && o.before.podiums === 0) {
      out.push({ kind: 'first-podium', driverId: o.driverId });
    }
    if (o.points > 0 && o.before.scores === 0) out.push({ kind: 'first-points', driverId: o.driverId });
  }

  const winner = outcomes.find((o) => o.position === 1);
  if (winner) {
    const count = winner.seasonWinsBefore + 1;
    const best = index.seasonMostWins.wins;
    out.push({ kind: 'season-wins', driverId: winner.driverId, count, record: count > best ? 'new' : count === best ? 'equal' : null });
    const streak = winner.streakBefore + 1;
    if (streak >= STREAK_MIN) out.push({ kind: 'win-streak', driverId: winner.driverId, count: streak });

    if (winner.dateOfBirth) {
      const age = ageOn(winner.dateOfBirth, date);
      const asRecord = (w: RecordWinner | null) => (w ? { name: w.name, season: w.season, age: ageOn(w.dateOfBirth, w.date) } : null);
      const youngest = asRecord(index.winners.youngest);
      const oldest = asRecord(index.winners.oldest);
      if (!youngest || ageKey(age) < ageKey(youngest.age)) out.push({ kind: 'youngest-winner', driverId: winner.driverId, age, previous: youngest });
      if (!oldest || ageKey(age) > ageKey(oldest.age)) out.push({ kind: 'oldest-winner', driverId: winner.driverId, age, previous: oldest });
    }
  }

  return out;
}
