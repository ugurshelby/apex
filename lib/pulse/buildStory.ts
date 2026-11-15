/**
 * Race story builder (Faz 21.4): turns a finished session's stored data into
 * the `race_stories` row (facts + milestones), without any narration (Faz 21.5
 * adds that on top). Called in-process: sync-f1 runs it after the response
 * when a round's result was written, and the watchdog (Faz 21.10) calls the
 * same function. No route, no queue.
 *
 * Idempotent: the row is rewritten only when the facts/milestones hash changes
 * or the result turns final. Only the `race` session is built so far (facts
 * come from the race classification, race control and lap positions).
 */

import { createHash } from 'node:crypto';
import recordsIndexJson from '@/data/records/index.json';
import { CURRENT_SEASON } from '@/lib/f1Calendar';
import { fetchSeasonSnapshotTyped, type MrData } from '@/lib/data/f1';
import type { LapPositionsSnapshot, RaceControlSnapshot } from '@/lib/f1/raceEvents';
import { getRaceResultRows, getRacesFromCalendar } from '@/lib/f1/mrdata';
import { findTitleDecider, type CalendarRound, type RoundPoints } from '@/lib/pulse/championship';
import { buildRaceFacts, type RaceFacts } from '@/lib/pulse/facts';
import {
  detectRaceMilestones,
  EMPTY_COUNTS,
  findIndexedDriver,
  type CareerCounts,
  type Milestone,
  type RaceOutcome,
  type RecordsIndex,
} from '@/lib/pulse/milestones';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Json, RaceStoryRow, RaceStorySession, SnapshotSource } from '@/types/database';

const recordsIndex = recordsIndexJson as unknown as RecordsIndex;

// ── Inputs ───────────────────────────────────────────────────────────────────

/** One round's stored snapshot of a session. */
export interface RoundResultSnapshot {
  round: number;
  data: MrData;
}

export interface StoryInputs {
  season: number;
  round: number;
  calendar: CalendarRound[];
  /** This round's `results` snapshot and who wrote it ('jolpica' = final). */
  race: { data: MrData; source: SnapshotSource } | null;
  /** This round's `qualifying` snapshot (pole). */
  qualifying: MrData | null;
  raceControl: RaceControlSnapshot | null;
  lapPositions: LapPositionsSnapshot | null;
  /** Every stored round of the season (database rows only, no live fallback), this one included. */
  history: { results: RoundResultSnapshot[]; sprints: RoundResultSnapshot[]; qualifying: RoundResultSnapshot[] };
}

export interface ComposedStory {
  facts: RaceFacts;
  milestones: Milestone[];
  factsHash: string;
}

interface RawRow {
  position?: string;
  points?: string;
  Driver?: { driverId?: string; familyName?: string; dateOfBirth?: string };
}

function rawRows(data: MrData | null, key: 'Results' | 'SprintResults' | 'QualifyingResults'): RawRow[] {
  const races = (data?.MRData as { RaceTable?: { Races?: Array<Record<string, unknown>> } } | undefined)?.RaceTable?.Races;
  const race = races?.[0];
  const rows = key === 'Results' ? race?.Results : key === 'SprintResults' ? race?.SprintResults : race?.QualifyingResults;
  return Array.isArray(rows) ? (rows as RawRow[]) : [];
}

function positionOf(row: RawRow): number | null {
  const n = Number(row.position);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** JSON with sorted keys: a value read back from jsonb (keys reordered) compares equal to the original. */
function canonical(value: unknown): string {
  if (value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashOf(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

// ── Milestone inputs ─────────────────────────────────────────────────────────

/**
 * One driver's line plus his history: index career counts (through the last
 * indexed season) and the earlier rounds of this season. A driver whose birth
 * date is unknown is left out on purpose: without it the index cannot be
 * matched, and an unmatched veteran would read as a rookie ("first win").
 */
function buildOutcomes(input: StoryInputs, index: RecordsIndex): RaceOutcome[] {
  if (!input.race) return [];
  const { round, history } = input;
  const byRound = (list: RoundResultSnapshot[]) => new Map(list.map((s) => [s.round, s.data]));
  const results = byRound(history.results);
  const sprints = byRound(history.sprints);
  const qualis = byRound(history.qualifying);

  const birthDates = new Map<string, string>();
  for (const s of history.results) {
    for (const r of rawRows(s.data, 'Results')) {
      if (r.Driver?.driverId && r.Driver.dateOfBirth) birthDates.set(r.Driver.driverId, r.Driver.dateOfBirth);
    }
  }

  const earlier = [...results.keys()].filter((r) => r < round).sort((a, b) => a - b);
  const poleOf = (data: MrData | null): string | null =>
    rawRows(data, 'QualifyingResults').find((r) => r.position === '1')?.Driver?.driverId ?? null;
  const sprintPoints = (data: MrData | undefined, id: string): number =>
    rawRows(data ?? null, 'SprintResults').reduce((sum, r) => (r.Driver?.driverId === id ? sum + (Number(r.points) || 0) : sum), 0);

  const outcomes: RaceOutcome[] = [];
  for (const row of rawRows(input.race.data, 'Results')) {
    const id = row.Driver?.driverId;
    const dob = id ? birthDates.get(id) : undefined;
    if (!id || !dob) continue;

    const byDate = index.drivers.filter((d) => d.dateOfBirth === dob);
    const indexed = findIndexedDriver(index, dob, row.Driver?.familyName ?? '') ?? (byDate.length === 1 ? byDate[0] : null);
    // Same birth date as several index drivers and no name match: unknown, not a rookie.
    if (!indexed && byDate.length > 1) continue;
    const before: CareerCounts = { ...(indexed ?? EMPTY_COUNTS) };
    let seasonWinsBefore = 0;
    let streakBefore = 0;
    for (const r of earlier) {
      const mine = rawRows(results.get(r) ?? null, 'Results').find((x) => x.Driver?.driverId === id);
      if (mine) {
        const pos = positionOf(mine);
        before.starts++;
        if (pos === 1) before.wins++;
        if (pos !== null && pos <= 3) before.podiums++;
        if ((Number(mine.points) || 0) > 0) before.scores++;
        if (pos === 1) {
          seasonWinsBefore++;
          streakBefore++;
        } else streakBefore = 0;
      } else streakBefore = 0;
      if (poleOf(qualis.get(r) ?? null) === id) before.poles++;
      if (sprintPoints(sprints.get(r), id) > 0) before.scores++;
    }

    outcomes.push({
      driverId: id,
      name: row.Driver?.familyName ?? id,
      position: positionOf(row),
      pole: poleOf(input.qualifying) === id,
      points: (Number(row.points) || 0) + sprintPoints(sprints.get(round), id),
      dateOfBirth: dob,
      before,
      seasonWinsBefore,
      streakBefore,
    });
  }
  return outcomes;
}

function titleDeciderOf(input: StoryInputs) {
  // The points rules in championship.ts are the current ones only.
  if (input.season !== CURRENT_SEASON) return null;
  const perRound = new Map<number, Map<string, number>>();
  const add = (round: number, rows: RawRow[]) => {
    const points = perRound.get(round) ?? new Map<string, number>();
    for (const r of rows) {
      const id = r.Driver?.driverId;
      if (id) points.set(id, (points.get(id) ?? 0) + (Number(r.points) || 0));
    }
    perRound.set(round, points);
  };
  for (const s of input.history.results) add(s.round, rawRows(s.data, 'Results'));
  for (const s of input.history.sprints) add(s.round, rawRows(s.data, 'SprintResults'));
  const rounds: RoundPoints[] = [...perRound].map(([round, points]) => ({ round, points }));
  return findTitleDecider(input.calendar, rounds);
}

// ── Composition (pure) ───────────────────────────────────────────────────────

/** Facts, milestones and their hash; null when the race has no classification yet. */
export function composeRaceStory(input: StoryInputs, index: RecordsIndex = recordsIndex): ComposedStory | null {
  if (!input.race) return null;
  const rows = getRaceResultRows(input.race.data);
  if (rows.length === 0) return null;

  const facts = buildRaceFacts({ rows, raceControl: input.raceControl, lapPositions: input.lapPositions });

  // Career counts are index (through last season) + this season's earlier rounds; any other
  // gap would turn veterans into "firsts", so the milestone finder stays silent instead.
  const indexFits = index.throughSeason === input.season - 1;
  const has = (list: RoundResultSnapshot[], round: number) => list.some((h) => h.round === round);
  const missing = input.calendar
    .filter(
      (c) =>
        c.round < input.round &&
        (!has(input.history.results, c.round) ||
          !has(input.history.qualifying, c.round) ||
          (c.hasSprint && !has(input.history.sprints, c.round))),
    )
    .map((c) => c.round);
  const date = input.calendar.find((r) => r.round === input.round)?.date ?? '';
  const milestones =
    indexFits && date && missing.length === 0
      ? detectRaceMilestones({
          season: input.season,
          round: input.round,
          date,
          outcomes: buildOutcomes(input, index),
          index,
          decider: titleDeciderOf(input),
        })
      : [];
  if (!indexFits) {
    console.warn(`[race story] records index covers up to ${String(index.throughSeason)}, not ${String(input.season - 1)}: milestones skipped`);
  } else if (missing.length > 0) {
    console.warn(`[race story] incomplete stored history for earlier rounds ${missing.join(',')}: milestones skipped`);
  }

  // The hash covers the facts only: it decides when the narrative is stale. Milestones refresh in place.
  return { facts, milestones, factsHash: hashOf(facts) };
}

// ── Write decision (pure) ────────────────────────────────────────────────────

type StoryKey = { season: number; round: number; session: RaceStorySession };
type StoryRowInput = Omit<RaceStoryRow, 'generated_at'>;
type StoredStory = Pick<RaceStoryRow, 'facts_hash' | 'source_final' | 'milestones'>;

export type StoryWrite =
  | { action: 'insert'; row: StoryRowInput }
  | { action: 'replace'; row: StoryRowInput; expectedHash: string }
  | { action: 'refresh-milestones'; milestones: Json; final: boolean; factsHash: string }
  | { action: 'mark-final'; factsHash: string }
  | { action: 'none' };

/**
 * What to do with the stored row:
 * - none: nothing new, or the stored row is final and this result is only provisional
 *   (a slower writer must never put provisional facts over a final row);
 * - replace: the facts changed; the old narrative told the old facts, so it is dropped;
 * - refresh-milestones: only the milestones changed (records index, history); the narrative stays;
 * - mark-final: same content, the result just turned final.
 */
export function planStoryWrite(existing: StoredStory | null, composed: ComposedStory, key: StoryKey, final: boolean): StoryWrite {
  const row: StoryRowInput = {
    ...key,
    facts: composed.facts as unknown as Json,
    facts_hash: composed.factsHash,
    milestones: composed.milestones as unknown as Json,
    narrative: null,
    status: 'facts_only',
    source_final: final,
  };
  if (!existing) return { action: 'insert', row };
  if (existing.source_final && !final) return { action: 'none' };
  if (existing.facts_hash !== composed.factsHash) return { action: 'replace', row, expectedHash: existing.facts_hash };
  if (hashOf(existing.milestones) !== hashOf(composed.milestones)) {
    return {
      action: 'refresh-milestones',
      milestones: row.milestones,
      final,
      factsHash: composed.factsHash,
    };
  }
  if (final && !existing.source_final) return { action: 'mark-final', factsHash: composed.factsHash };
  return { action: 'none' };
}

// ── Storage ──────────────────────────────────────────────────────────────────

export interface StoryDeps {
  loadInputs(season: number, round: number): Promise<StoryInputs>;
  readStory(key: StoryKey): Promise<StoredStory | null>;
  /** True when a row was written; false when another writer changed the row first (nothing is overwritten). */
  writeStory(write: Exclude<StoryWrite, { action: 'none' }>, key: StoryKey): Promise<boolean>;
}

async function loadInputs(season: number, round: number): Promise<StoryInputs> {
  const db = getSupabaseAdmin();
  const [{ data: rows, error }, { data: history, error: historyError }, calendarData] = await Promise.all([
    db
      .from('f1_snapshots')
      .select('type, source, data')
      .eq('season', season)
      .eq('round', round)
      .in('type', ['results', 'qualifying', 'race_control', 'lap_positions']),
    // One query for the whole season, database rows only: a live fallback here would cost an upstream call per round.
    db
      .from('f1_snapshots')
      .select('round, type, data')
      .eq('season', season)
      .not('round', 'is', null)
      .in('type', ['results', 'sprint', 'qualifying']),
    fetchSeasonSnapshotTyped(season, 'calendar'),
  ]);
  if (error) throw new Error(`f1_snapshots read: ${error.message}`);
  if (historyError) throw new Error(`f1_snapshots history read: ${historyError.message}`);
  const row = (type: string) => rows.find((r) => r.type === type);
  const past = (type: string): RoundResultSnapshot[] =>
    history.flatMap((h) => (h.type === type && h.round !== null ? [{ round: h.round, data: h.data as MrData }] : []));

  const races = getRacesFromCalendar(calendarData);
  const calendar: CalendarRound[] = races
    .map((r) => ({ round: Number(r.round), date: r.date ?? '', raceName: r.raceName ?? '', hasSprint: Boolean(r.Sprint) }))
    .filter((r) => Number.isFinite(r.round) && r.round > 0 && r.date);

  const results0 = row('results');
  const qualifyingRow = row('qualifying');
  const raceControlRow = row('race_control');
  const lapPositionsRow = row('lap_positions');
  return {
    season,
    round,
    calendar,
    race: results0 ? { data: results0.data as MrData, source: results0.source } : null,
    qualifying: qualifyingRow ? (qualifyingRow.data as MrData) : null,
    // The minimum shape the fact builders read; anything else is treated as absent.
    raceControl: Array.isArray((raceControlRow?.data as { messages?: unknown } | undefined)?.messages)
      ? (raceControlRow?.data as unknown as RaceControlSnapshot)
      : null,
    lapPositions: Array.isArray((lapPositionsRow?.data as { drivers?: unknown } | undefined)?.drivers)
      ? (lapPositionsRow?.data as unknown as LapPositionsSnapshot)
      : null,
    history: { results: past('results'), sprints: past('sprint'), qualifying: past('qualifying') },
  };
}

const defaultDeps: StoryDeps = {
  loadInputs,
  async readStory(key) {
    const { data, error } = await getSupabaseAdmin()
      .from('race_stories')
      .select('facts_hash, source_final, milestones')
      .eq('season', key.season)
      .eq('round', key.round)
      .eq('session', key.session)
      .maybeSingle();
    if (error) throw new Error(`race_stories read: ${error.message}`);
    return data;
  },
  async writeStory(write, key) {
    const db = getSupabaseAdmin();
    if (write.action === 'insert') {
      // Insert only: if a concurrent writer got there first, its row stands and the next run compares.
      const { data, error } = await db
        .from('race_stories')
        .upsert({ ...write.row, generated_at: new Date().toISOString() }, { onConflict: 'season,round,session', ignoreDuplicates: true })
        .select('round');
      if (error) throw new Error(`race_stories insert: ${error.message}`);
      return data.length > 0;
    }
    if (write.action === 'replace') {
      let query = db
        .from('race_stories')
        .update({ ...write.row, generated_at: new Date().toISOString() })
        .eq('season', key.season)
        .eq('round', key.round)
        .eq('session', key.session)
        .eq('facts_hash', write.expectedHash); // compare-and-set: only over the row that was read
      // A provisional build must not land over a row that turned final in the meantime.
      if (!write.row.source_final) query = query.eq('source_final', false);
      const { data, error } = await query.select('round');
      if (error) throw new Error(`race_stories replace: ${error.message}`);
      return data.length > 0;
    }
    if (write.action === 'refresh-milestones') {
      const { data, error } = await db
        .from('race_stories')
        .update(write.final ? { milestones: write.milestones, source_final: true } : { milestones: write.milestones })
        .eq('season', key.season)
        .eq('round', key.round)
        .eq('session', key.session)
        .eq('facts_hash', write.factsHash)
        .select('round');
      if (error) throw new Error(`race_stories milestones: ${error.message}`);
      return data.length > 0;
    }
    const { data, error } = await db
      .from('race_stories')
      .update({ source_final: true })
      .eq('season', key.season)
      .eq('round', key.round)
      .eq('session', key.session)
      .eq('facts_hash', write.factsHash)
      .select('round');
    if (error) throw new Error(`race_stories final: ${error.message}`);
    return data.length > 0;
  },
};

/**
 * True when the session has no story row yet or its row is still provisional:
 * sync-f1 uses it to retry a build that failed or never ran (the watchdog,
 * Faz 21.10, does the same later). A failed read counts as "no".
 */
export async function storyNeedsBuild(key: StoryKey, deps: Pick<StoryDeps, 'readStory'> = defaultDeps): Promise<boolean> {
  try {
    const stored = await deps.readStory(key);
    return stored === null || !stored.source_final;
  } catch (err) {
    console.warn('[race story] retry check failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

export type BuildStoryStatus = 'written' | 'final-marked' | 'unchanged' | 'no-results' | 'unsupported' | 'error';

/**
 * Builds (or refreshes) the story row of one session. `final` says the
 * classification is Jolpica's final one; left out, it is read from the stored
 * results row. Never throws: sync-f1 calls it after the response.
 */
export async function buildRaceStory(
  opts: { season: number; round: number; session: RaceStorySession; final?: boolean },
  deps: StoryDeps = defaultDeps,
): Promise<BuildStoryStatus> {
  const key = { season: opts.season, round: opts.round, session: opts.session };
  if (opts.session !== 'race') return 'unsupported';
  try {
    const input = await deps.loadInputs(opts.season, opts.round);
    const composed = composeRaceStory(input);
    if (!composed) return 'no-results';
    const final = opts.final ?? input.race?.source === 'jolpica';
    const write = planStoryWrite(await deps.readStory(key), composed, key, final);
    if (write.action === 'none') return 'unchanged';
    if (!(await deps.writeStory(write, key))) return 'unchanged';
    return write.action === 'mark-final' ? 'final-marked' : 'written';
  } catch (err) {
    console.error(`[race story] build failed (${[opts.season, opts.round, opts.session].join('/')}):`, err);
    return 'error';
  }
}
