import { describe, expect, it, vi } from 'vitest';
import type { MrData } from '@/lib/data/f1';
import {
  buildRaceStory,
  composeRaceStory,
  planStoryWrite,
  storyNeedsBuild,
  type StoryDeps,
  type StoryInputs,
  type StoryWrite,
} from '@/lib/pulse/buildStory';
import type { Milestone } from '@/lib/pulse/milestones';
import type { Json } from '@/types/database';

interface Line {
  id: string;
  family: string;
  code: string;
  team: string;
  pos: number;
  points: number;
  dob?: string;
  status?: string;
}

function results(lines: Line[]): MrData {
  return {
    MRData: {
      RaceTable: {
        Races: [
          {
            Results: lines.map((l) => ({
              position: String(l.pos),
              grid: String(l.pos),
              laps: '57',
              points: String(l.points),
              status: l.status ?? 'Finished',
              Time: { time: '1:30:00.000' },
              Driver: { driverId: l.id, givenName: 'X', familyName: l.family, code: l.code, dateOfBirth: l.dob },
              Constructor: { constructorId: l.team, name: l.team },
            })),
          },
        ],
      },
    },
  };
}

function qualifying(poleId: string): MrData {
  return { MRData: { RaceTable: { Races: [{ QualifyingResults: [{ position: '1', Driver: { driverId: poleId } }] }] } } };
}

const VER = { id: 'max_verstappen', family: 'Verstappen', code: 'VER', team: 'Red Bull', dob: '1997-09-30' };
const ANT = { id: 'antonelli', family: 'Antonelli', code: 'ANT', team: 'Mercedes', dob: '2006-08-25' };
// Not in the records index (no race before 2026): a rookie.
const LIN = { id: 'lindblad', family: 'Lindblad', code: 'LIN', team: 'Racing Bulls', dob: '2007-08-08' };

const CALENDAR = [
  { round: 1, date: '2026-03-08', raceName: 'Australian Grand Prix', hasSprint: false },
  { round: 2, date: '2026-03-15', raceName: 'Chinese Grand Prix', hasSprint: false },
];

function inputs(over: Partial<StoryInputs> = {}): StoryInputs {
  const round1 = results([
    { ...VER, pos: 1, points: 25 },
    { ...ANT, pos: 2, points: 18 },
    { ...LIN, pos: 12, points: 0 },
  ]);
  const round2 = results([
    { ...LIN, pos: 1, points: 25 },
    { ...VER, pos: 2, points: 18 },
    { ...ANT, pos: 3, points: 15 },
  ]);
  return {
    season: 2026,
    round: 2,
    calendar: CALENDAR,
    race: { data: round2, source: 'jolpica' },
    qualifying: qualifying('lindblad'),
    raceControl: null,
    lapPositions: null,
    history: {
      results: [
        { round: 1, data: round1 },
        { round: 2, data: round2 },
      ],
      sprints: [],
      qualifying: [{ round: 1, data: qualifying('max_verstappen') }],
    },
    ...over,
  };
}

const kinds = (ms: Milestone[]) => ms.map((m) => `${m.kind}:${m.driverId}`);

describe('composeRaceStory', () => {
  it('returns null while the race has no classification', () => {
    expect(composeRaceStory(inputs({ race: null }))).toBeNull();
    expect(composeRaceStory(inputs({ race: { data: results([]), source: 'openf1' } }))).toBeNull();
  });

  it('builds facts from the classification', () => {
    const story = composeRaceStory(inputs());
    expect(story?.facts.summary?.winner.driverId).toBe('lindblad');
  });

  it('gives the same hash for the same input and a new one when the facts change', () => {
    const a = composeRaceStory(inputs());
    const b = composeRaceStory(inputs());
    expect(a?.factsHash).toBe(b?.factsHash);

    const changed = results([
      { ...LIN, pos: 1, points: 25 },
      { ...ANT, pos: 2, points: 18 },
      { ...VER, pos: 3, points: 15, status: 'Engine' },
    ]);
    const c = composeRaceStory(inputs({ race: { data: changed, source: 'jolpica' } }));
    expect(c?.factsHash).not.toBe(a?.factsHash);
  });

  it('finds a rookie first win from the index plus the earlier rounds', () => {
    const ms = composeRaceStory(inputs())?.milestones ?? [];
    expect(kinds(ms)).toContain('first-win:lindblad');
    expect(kinds(ms)).toContain('first-pole:lindblad');
    // Verstappen has won before: no "first" claims for him.
    expect(kinds(ms).filter((k) => k.endsWith(':max_verstappen') && k.startsWith('first'))).toEqual([]);
  });

  it('counts this season\'s earlier wins for the season-wins milestone', () => {
    const ms = composeRaceStory(inputs({ round: 2 }))?.milestones ?? [];
    const wins = ms.find((m) => m.kind === 'season-wins');
    expect(wins).toMatchObject({ driverId: 'lindblad', count: 1 });
  });

  it('never claims a first for a driver whose birth date is unknown', () => {
    const noDob = results([
      { ...LIN, dob: undefined, pos: 1, points: 25 },
      { ...ANT, pos: 2, points: 18 },
    ]);
    const story = composeRaceStory(
      inputs({
        race: { data: noDob, source: 'jolpica' },
        history: { results: [{ round: 2, data: noDob }], sprints: [], qualifying: [] },
      }),
    );
    expect(kinds(story?.milestones ?? [])).not.toContain('first-win:lindblad');
  });

  it('stays silent about milestones when the index does not end the season before', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const story = composeRaceStory(inputs({ season: 2027 }));
    expect(story?.milestones).toEqual([]);
    warn.mockRestore();
  });
});

describe('planStoryWrite', () => {
  const key = { season: 2026, round: 2, session: 'race' as const };
  const composed = composeRaceStory(inputs());
  if (!composed) throw new Error('fixture must compose');
  const sameMilestones = JSON.parse(JSON.stringify(composed.milestones)) as Json;
  const stored = (over: Partial<{ facts_hash: string; source_final: boolean; milestones: Json }> = {}) => ({
    facts_hash: composed.factsHash,
    source_final: false,
    milestones: sameMilestones,
    ...over,
  });

  it('inserts a missing row, as facts only', () => {
    const w = planStoryWrite(null, composed, key, false);
    expect(w).toMatchObject({ action: 'insert', row: { status: 'facts_only', narrative: null, source_final: false } });
  });

  it('leaves an unchanged row alone', () => {
    expect(planStoryWrite(stored(), composed, key, false).action).toBe('none');
    expect(planStoryWrite(stored({ source_final: true }), composed, key, true).action).toBe('none');
  });

  it('replaces a row whose facts changed, drops the old narrative and guards on the hash it read', () => {
    const w = planStoryWrite(stored({ facts_hash: 'old' }), composed, key, true);
    expect(w).toMatchObject({ action: 'replace', expectedHash: 'old', row: { status: 'facts_only', narrative: null, source_final: true } });
  });

  it('only marks a row final when the result turned final with the same content', () => {
    expect(planStoryWrite(stored(), composed, key, true)).toEqual({ action: 'mark-final', factsHash: composed.factsHash });
  });

  it('never puts a provisional result over a final row, even with different facts', () => {
    expect(planStoryWrite(stored({ source_final: true, facts_hash: 'final-facts' }), composed, key, false).action).toBe('none');
  });

  it('refreshes only the milestones when just they changed, keeping the narrative', () => {
    const w = planStoryWrite(stored({ milestones: [] }), composed, key, false);
    expect(w).toMatchObject({ action: 'refresh-milestones', factsHash: composed.factsHash, final: false });
    expect(w).not.toHaveProperty('row');
  });

  it('does not see a change when jsonb reordered the keys of stored milestones', () => {
    const reordered = (composed.milestones as unknown as Record<string, unknown>[]).map((m) =>
      Object.fromEntries(Object.entries(m).reverse()),
    ) as unknown as Json;
    expect(planStoryWrite(stored({ milestones: reordered }), composed, key, false).action).toBe('none');
  });
});

function fakeDeps(over: Partial<StoryDeps> = {}) {
  type Stored = { facts_hash: string; source_final: boolean; milestones: Json };
  let current: Stored | null = null;
  const writes: StoryWrite[] = [];
  const deps: StoryDeps = {
    loadInputs: () => Promise.resolve(inputs()),
    readStory: () => Promise.resolve(current),
    writeStory: (write) => {
      writes.push(write);
      if (write.action === 'mark-final') current = current && { ...current, source_final: true };
      else if (write.action === 'refresh-milestones') current = current && { ...current, milestones: write.milestones };
      else current = { facts_hash: write.row.facts_hash, source_final: write.row.source_final, milestones: write.row.milestones };
      return Promise.resolve(true);
    },
    ...over,
  };
  return { deps, writes };
}

describe('buildRaceStory', () => {
  const opts = { season: 2026, round: 2, session: 'race' as const };

  it('does not write twice for the same input', async () => {
    const { deps, writes } = fakeDeps();
    expect(await buildRaceStory(opts, deps)).toBe('written');
    expect(await buildRaceStory(opts, deps)).toBe('unchanged');
    expect(writes).toHaveLength(1);
  });

  it('marks the row final when the final result arrives, without rewriting the facts', async () => {
    const { deps, writes } = fakeDeps();
    expect(await buildRaceStory({ ...opts, final: false }, deps)).toBe('written');
    expect(await buildRaceStory({ ...opts, final: true }, deps)).toBe('final-marked');
    expect(writes.map((w) => w.action)).toEqual(['insert', 'mark-final']);
  });

  it('a slower provisional build cannot downgrade a final row', async () => {
    const { deps, writes } = fakeDeps();
    expect(await buildRaceStory({ ...opts, final: true }, deps)).toBe('written');
    expect(await buildRaceStory({ ...opts, final: false }, deps)).toBe('unchanged');
    expect(writes).toHaveLength(1);
  });

  it('reads finality from the stored results source when not told', async () => {
    const { deps, writes } = fakeDeps();
    await buildRaceStory(opts, deps);
    expect(writes[0]).toMatchObject({ row: { source_final: true } }); // inputs() result source is jolpica
  });

  it('reports "unchanged" when another writer got to the row first', async () => {
    const { deps } = fakeDeps({ writeStory: () => Promise.resolve(false) });
    expect(await buildRaceStory(opts, deps)).toBe('unchanged');
  });

  it('writes nothing without a classification', async () => {
    const { deps, writes } = fakeDeps({ loadInputs: () => Promise.resolve(inputs({ race: null })) });
    expect(await buildRaceStory(opts, deps)).toBe('no-results');
    expect(writes).toHaveLength(0);
  });

  it('only builds the race session for now', async () => {
    const { deps, writes } = fakeDeps();
    expect(await buildRaceStory({ ...opts, session: 'qualifying' }, deps)).toBe('unsupported');
    expect(writes).toHaveLength(0);
  });

  it('returns an error status instead of throwing', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { deps } = fakeDeps({
      loadInputs: () => Promise.reject(new Error('db down')),
    });
    expect(await buildRaceStory(opts, deps)).toBe('error');
    err.mockRestore();
  });
});

describe('storyNeedsBuild', () => {
  const key = { season: 2026, round: 2, session: 'race' as const };
  const row = (source_final: boolean) => ({ facts_hash: 'h', source_final, milestones: [] as Json });

  it('is true for a missing or provisional row and false for a final one', async () => {
    expect(await storyNeedsBuild(key, { readStory: () => Promise.resolve(null) })).toBe(true);
    expect(await storyNeedsBuild(key, { readStory: () => Promise.resolve(row(false)) })).toBe(true);
    expect(await storyNeedsBuild(key, { readStory: () => Promise.resolve(row(true)) })).toBe(false);
  });

  it('is false when the read fails, so a database outage does not start builds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await storyNeedsBuild(key, { readStory: () => Promise.reject(new Error('down')) })).toBe(false);
    warn.mockRestore();
  });
});

describe('composeRaceStory milestone safety', () => {
  it('skips milestones when an earlier round has no stored qualifying, so poles are never undercounted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const base = inputs();
    const story = composeRaceStory({ ...base, history: { ...base.history, qualifying: [] } });
    expect(story?.milestones).toEqual([]);
    warn.mockRestore();
  });

  it('skips milestones when an earlier sprint weekend has no stored sprint', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const base = inputs();
    const calendar = base.calendar.map((c) => (c.round === 1 ? { ...c, hasSprint: true } : c));
    expect(composeRaceStory({ ...base, calendar })?.milestones).toEqual([]);
    warn.mockRestore();
  });

  it('matches a veteran by birth date when the family name differs from the index', () => {
    // Index family name is "Verstappen"; upstream spells it differently.
    const spelled = results([
      { ...VER, family: 'Verstappen-Test', pos: 1, points: 25 },
      { ...ANT, pos: 2, points: 18 },
    ]);
    const base = inputs();
    const story = composeRaceStory({ ...base, race: { data: spelled, source: 'jolpica' }, qualifying: qualifying('x') });
    const firsts = (story?.milestones ?? []).filter((m) => m.kind.startsWith('first') && m.driverId === 'max_verstappen');
    expect(firsts).toEqual([]); // a veteran, not a rookie
  });
});

describe('composeRaceStory milestones with gaps in the stored history', () => {
  it('skips milestones when an earlier round has no stored result, instead of guessing "firsts"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const base = inputs();
    const story = composeRaceStory({ ...base, history: { ...base.history, results: base.history.results.filter((r) => r.round !== 1) } });
    expect(story?.milestones).toEqual([]);
    expect(story?.facts.summary).not.toBeNull(); // facts do not depend on history
    warn.mockRestore();
  });
});
