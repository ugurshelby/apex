import { describe, expect, it } from 'vitest';
import recordsIndex from '@/data/records/index.json';
import { findTitleDecider, type PointsRules } from '@/lib/pulse/championship';
import {
  EMPTY_COUNTS,
  detectRaceMilestones,
  findIndexedDriver,
  type RaceOutcome,
  type RecordsIndex,
} from '@/lib/pulse/milestones';
import { MEXICO_2026_CALENDAR, MEXICO_2026_ROUND_POINTS } from './fixtures/mexico-2026';
import { CALENDAR_2008, CALENDAR_2010, POINTS_2008, POINTS_2010 } from './fixtures/titles-2008-2010';

const index = recordsIndex as RecordsIndex;
const NO_SPRINT_25: PointsRules = { race: 25, sprint: 0 };
const NO_SPRINT_10: PointsRules = { race: 10, sprint: 0 };

function outcome(partial: Partial<RaceOutcome> & Pick<RaceOutcome, 'driverId' | 'name'>): RaceOutcome {
  return { position: null, pole: false, points: 0, before: { ...EMPTY_COUNTS, starts: 10 }, seasonWinsBefore: 0, streakBefore: 0, ...partial };
}

describe('records index', () => {
  it('covers 1950 to the season before the live one', () => {
    expect(index.throughSeason).toBe(2025);
    expect(index.champions[0].season).toBe(1950);
    expect(index.champions.at(-1)?.season).toBe(2025);
    expect(index.seasonMostWins).toEqual({ wins: 19, season: 2023, name: 'Max Verstappen' });
    expect(index.winners.youngest).toMatchObject({ name: 'Max Verstappen', season: 2016, round: 5 });
  });

  it('matches live drivers by birth date and family name, not by id', () => {
    expect(findIndexedDriver(index, '2006-08-25', 'Antonelli')).toMatchObject({ id: 'kimi-antonelli', wins: 0, podiums: 3 });
    expect(findIndexedDriver(index, '1987-08-19', 'Hülkenberg')?.id).toBe('nico-hulkenberg');
    expect(findIndexedDriver(index, '2007-08-08', 'Lindblad')).toBeNull(); // rookie: no race before 2026
  });
});

describe('champion milestones', () => {
  it('Mexico 2026: champion and youngest champion, ahead of Vettel 2010', () => {
    const decider = findTitleDecider(MEXICO_2026_CALENDAR, MEXICO_2026_ROUND_POINTS);
    const ms = detectRaceMilestones({
      season: 2026,
      round: 19,
      date: '2026-11-01',
      decider,
      index,
      outcomes: [
        // Career counts through 2025 from the index; Verstappen won R16 and R17 before Mexico.
        outcome({ driverId: 'max_verstappen', name: 'Max Verstappen', position: 1, points: 25, dateOfBirth: '1997-09-30', seasonWinsBefore: 2, streakBefore: 0, before: findIndexedDriver(index, '1997-09-30', 'Verstappen')! }),
        outcome({ driverId: 'antonelli', name: 'Kimi Antonelli', position: 3, points: 15, dateOfBirth: '2006-08-25', before: findIndexedDriver(index, '2006-08-25', 'Antonelli')! }),
      ],
    });
    expect(ms).toContainEqual({ kind: 'champion', driverId: 'antonelli', season: 2026, round: 19 });
    expect(ms).toContainEqual({
      kind: 'youngest-champion',
      driverId: 'antonelli',
      age: { years: 20, days: 68 },
      previous: { name: 'Sebastian Vettel', season: 2010, age: { years: 23, days: 134 } },
    });
    expect(ms.some((m) => m.kind === 'oldest-champion')).toBe(false);
    expect(ms).toContainEqual({ kind: 'season-wins', driverId: 'max_verstappen', count: 3, record: null });
  });

  it('Vettel 2010: settled at the final race, youngest ahead of Hamilton 2008', () => {
    const decider = findTitleDecider(CALENDAR_2010, POINTS_2010, NO_SPRINT_25);
    expect(decider).toMatchObject({ championId: 'sebastian-vettel', round: 19, championPoints: 256, rivalId: 'fernando-alonso', rivalPoints: 252 });
    const ms = detectRaceMilestones({
      season: 2010,
      round: 19,
      date: '2010-11-14',
      decider,
      index,
      outcomes: [outcome({ driverId: 'sebastian-vettel', name: 'Sebastian Vettel', position: 1, points: 25, dateOfBirth: '1987-07-03', seasonWinsBefore: 4, before: { starts: 61, wins: 9, poles: 15, podiums: 18, scores: 45 } })],
    });
    expect(ms).toContainEqual({
      kind: 'youngest-champion',
      driverId: 'sebastian-vettel',
      age: { years: 23, days: 134 },
      previous: { name: 'Lewis Hamilton', season: 2008, age: { years: 23, days: 300 } },
    });
  });

  it('Hamilton 2008: one point at the final race (10-point win), youngest ahead of Alonso 2005', () => {
    const decider = findTitleDecider(CALENDAR_2008, POINTS_2008, NO_SPRINT_10);
    expect(decider).toMatchObject({ championId: 'lewis-hamilton', round: 18, championPoints: 98, rivalId: 'felipe-massa', rivalPoints: 97 });
    // Not settled before Brazil: Massa was 7 behind with 10 points left.
    expect(findTitleDecider(CALENDAR_2008, POINTS_2008.slice(0, 17), NO_SPRINT_10)).toBeNull();
    const ms = detectRaceMilestones({
      season: 2008,
      round: 18,
      date: '2008-11-02',
      decider,
      index,
      outcomes: [outcome({ driverId: 'lewis-hamilton', name: 'Lewis Hamilton', position: 5, points: 4, dateOfBirth: '1985-01-07' })],
    });
    expect(ms).toContainEqual({
      kind: 'youngest-champion',
      driverId: 'lewis-hamilton',
      age: { years: 23, days: 300 },
      previous: { name: 'Fernando Alonso', season: 2005, age: { years: 24, days: 58 } },
    });
  });
});

describe('race milestones', () => {
  it('finds first win, pole, podium and points from the counts before the race', () => {
    const ms = detectRaceMilestones({
      season: 2030,
      round: 4,
      date: '2030-04-20',
      index,
      outcomes: [
        outcome({ driverId: 'a', name: 'A', position: 1, pole: true, points: 25 }),
        outcome({ driverId: 'b', name: 'B', position: 3, points: 15, before: { ...EMPTY_COUNTS, starts: 5, scores: 2 } }),
        outcome({ driverId: 'c', name: 'C', position: 10, points: 1 }),
        outcome({ driverId: 'd', name: 'D', position: 2, points: 18, before: { starts: 50, wins: 2, poles: 1, podiums: 8, scores: 30 } }),
      ],
    });
    const kinds = ms.map((m) => `${m.kind}:${'driverId' in m ? m.driverId : ''}`);
    expect(kinds).toEqual(
      expect.arrayContaining(['first-win:a', 'first-pole:a', 'first-points:a', 'first-podium:b', 'first-points:c']),
    );
    expect(kinds).not.toContain('first-podium:a'); // a win is reported as the first win, not as a podium
    expect(kinds.filter((k) => k.endsWith(':d'))).toEqual([]);
  });

  it('counts season wins against the record and reports a streak from three', () => {
    const run = (seasonWinsBefore: number, streakBefore: number) =>
      detectRaceMilestones({
        season: 2030,
        round: 22,
        date: '2030-11-20',
        index,
        outcomes: [outcome({ driverId: 'w', name: 'W', position: 1, points: 25, seasonWinsBefore, streakBefore, before: { starts: 90, wins: 30, poles: 20, podiums: 50, scores: 80 } })],
      });
    expect(run(18, 1)).toContainEqual({ kind: 'season-wins', driverId: 'w', count: 19, record: 'equal' });
    expect(run(19, 1)).toContainEqual({ kind: 'season-wins', driverId: 'w', count: 20, record: 'new' });
    expect(run(5, 1).some((m) => m.kind === 'win-streak')).toBe(false);
    expect(run(5, 2)).toContainEqual({ kind: 'win-streak', driverId: 'w', count: 3 });
  });

  it('beats the youngest-winner record only when younger', () => {
    const ms = (dateOfBirth: string) =>
      detectRaceMilestones({
        season: 2030,
        round: 1,
        date: '2030-03-10',
        index,
        outcomes: [outcome({ driverId: 'y', name: 'Y', position: 1, points: 25, dateOfBirth, before: { starts: 20, wins: 1, poles: 1, podiums: 3, scores: 10 } })],
      });
    expect(ms('2012-01-01').find((m) => m.kind === 'youngest-winner')).toMatchObject({
      age: { years: 18, days: 68 },
      previous: { name: 'Max Verstappen', season: 2016 },
    });
    expect(ms('2005-01-01').some((m) => m.kind === 'youngest-winner')).toBe(false);
  });
});
