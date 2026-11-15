/**
 * Reader for `race_stories` (Faz 21.4): the facts, milestones and narrative of
 * one finished session. Public read through the anon client (RLS); the builder
 * in lib/pulse/buildStory.ts is the only writer. A failed read is `null`, never
 * a throw, so a page without a story simply draws no story section.
 */

import { getSupabaseClient } from '@/lib/supabase';
import type { RaceStoryRow, RaceStorySession } from '@/types/database';

export async function getRaceStory(
  season: number,
  round: number,
  session: RaceStorySession,
): Promise<RaceStoryRow | null> {
  const tag = [season, round, session].join('/');
  try {
    const { data, error } = await getSupabaseClient()
      .from('race_stories')
      .select('*')
      .eq('season', season)
      .eq('round', round)
      .eq('session', session)
      .maybeSingle();
    if (error) {
      console.warn(`[race_stories] read failed (${tag}): ${error.message}`);
      return null;
    }
    return data;
  } catch (err) {
    console.warn(`[race_stories] read failed (${tag}):`, err instanceof Error ? err.message : err);
    return null;
  }
}
