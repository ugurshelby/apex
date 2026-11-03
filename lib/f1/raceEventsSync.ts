/**
 * sync-f1 step (Faz 21.1): after a race, store OpenF1 race control messages
 * (`race_control`) and the lap-by-lap running order (`lap_positions`) for the
 * fact extractor (Faz 21.2). Pure builders in lib/f1/raceEvents.ts.
 *
 * Fires for the latest started race within RACE_EVENTS_WINDOW_MS of its start,
 * once the OpenF1 race session ended FIRST_READ_AFTER_MS ago. Writes both rows
 * once, then once more after FINAL_READ_AFTER_MS so the stewards' post-race
 * decisions are in; after that it stays idle.
 */

import { CURRENT_SEASON, getLastFinishedRace, raceStartMs, type CalendarRace } from '@/lib/f1Calendar';
import { buildLapPositions, buildRaceControlSnapshot } from '@/lib/f1/raceEvents';
import {
  fetchLaps,
  fetchLiveDrivers,
  fetchLivePositions,
  fetchRaceControl,
  fetchRaceSessionsOfYear,
} from '@/lib/f1/sources/openf1';
import { isOpenF1Restricted } from '@/lib/f1/sources/openf1Errors';
import { upsertF1Snapshot, type IngestStats } from '@/lib/f1Ingest';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Json } from '@/types/database';

export const RACE_EVENTS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/** OpenF1 has the full lap and position series well within this after the flag. */
export const FIRST_READ_AFTER_MS = 30 * 60 * 1000;
/** Stewards' post-race decisions are usually out by then. */
export const FINAL_READ_AFTER_MS = 2 * 60 * 60 * 1000;

export type RaceEventsStatus =
  | 'no-race'
  | 'session-not-found'
  | 'too-early'
  | 'up-to-date'
  | 'locked'
  | 'not-published'
  | 'written'
  | 'error';

export interface RaceEventsOutcome {
  status: RaceEventsStatus;
  round: number | null;
  raceControl?: boolean;
  lapPositions?: boolean;
}

/** Same calendar day (UTC) as the race, within a day either side. */
function sessionMatchesRace(dateStart: string, race: CalendarRace): boolean {
  const start = raceStartMs(race);
  const t = Date.parse(dateStart);
  return start !== null && Number.isFinite(t) && Math.abs(t - start) < 24 * 60 * 60 * 1000;
}

/** A stored row is final once it was fetched after the final-read mark. */
export function isFinalRead(fetchedAt: string | null | undefined, sessionEndMs: number): boolean {
  const t = fetchedAt ? Date.parse(fetchedAt) : NaN;
  return Number.isFinite(t) && t >= sessionEndMs + FINAL_READ_AFTER_MS;
}

/** Whether a row should be (re)written now: missing, or not final while the final read is due. */
export function raceEventsDue(fetchedAt: string | null | undefined, sessionEndMs: number, nowMs: number): boolean {
  if (nowMs < sessionEndMs + FIRST_READ_AFTER_MS) return false;
  if (!fetchedAt) return true;
  return !isFinalRead(fetchedAt, sessionEndMs) && nowMs >= sessionEndMs + FINAL_READ_AFTER_MS;
}

export async function syncRaceEventsFromOpenF1(opts: {
  races: CalendarRace[];
  now: Date;
  stats: IngestStats;
}): Promise<RaceEventsOutcome> {
  const { races, now, stats } = opts;
  const race = getLastFinishedRace(races, now);
  const round = Number(race?.round);
  const start = race ? raceStartMs(race) : null;
  if (!race || !round || start === null || now.getTime() - start > RACE_EVENTS_WINDOW_MS) {
    return { status: 'no-race', round: null };
  }

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('f1_snapshots')
      .select('type, fetched_at')
      .eq('season', CURRENT_SEASON)
      .eq('round', round)
      .in('type', ['race_control', 'lap_positions']);
    if (error) throw new Error(`f1_snapshots read: ${error.message}`);
    const fetchedAt = (type: string) => (data ?? []).find((r) => r.type === type)?.fetched_at ?? null;

    const sessions = await fetchRaceSessionsOfYear(CURRENT_SEASON);
    const session = sessions.find((s) => sessionMatchesRace(s.date_start, race));
    if (!session) return { status: 'session-not-found', round };
    const end = Date.parse(session.date_end);
    if (!Number.isFinite(end)) return { status: 'session-not-found', round };
    if (now.getTime() < end + FIRST_READ_AFTER_MS) return { status: 'too-early', round };

    const rcDue = raceEventsDue(fetchedAt('race_control'), end, now.getTime());
    const lpDue = raceEventsDue(fetchedAt('lap_positions'), end, now.getTime());
    if (!rcDue && !lpDue) return { status: 'up-to-date', round };

    const outcome: RaceEventsOutcome = { status: 'written', round, raceControl: false, lapPositions: false };

    if (rcDue) {
      const snapshot = buildRaceControlSnapshot({
        season: CURRENT_SEASON,
        round,
        sessionKey: session.session_key,
        sessionEnd: session.date_end,
        messages: await fetchRaceControl(session.session_key),
      });
      if (snapshot) {
        await upsertF1Snapshot(CURRENT_SEASON, round, 'race_control', snapshot as unknown as Json, 'openf1');
        stats.upserted++;
        outcome.raceControl = true;
      }
    }

    if (lpDue) {
      // Sequential: OpenF1's free tier rate-limits bursts (openf1Fetch spaces requests anyway).
      const positions = await fetchLivePositions(session.session_key);
      const laps = await fetchLaps(session.session_key);
      const roster = await fetchLiveDrivers(session.session_key);
      const snapshot = buildLapPositions({ season: CURRENT_SEASON, round, sessionKey: session.session_key, positions, laps, roster });
      if (snapshot) {
        await upsertF1Snapshot(CURRENT_SEASON, round, 'lap_positions', snapshot as unknown as Json, 'openf1');
        stats.upserted++;
        outcome.lapPositions = true;
      }
    }

    if (!outcome.raceControl && !outcome.lapPositions) return { status: 'not-published', round };
    return outcome;
  } catch (err) {
    if (isOpenF1Restricted(err)) return { status: 'locked', round };
    stats.errors.push(`race events R${round}: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 'error', round };
  }
}
