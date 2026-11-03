import { describe, expect, it } from 'vitest';
import recordsIndex from '@/data/records/index.json';
import {
  ageOn,
  compareChampionAge,
  findTitleDecider,
  maxPointsAfter,
  type ChampionRecord,
} from '@/lib/pulse/championship';
import { MEXICO_2026_CALENDAR, MEXICO_2026_ROUND_POINTS } from './fixtures/mexico-2026';

const records = recordsIndex.champions as ChampionRecord[];

describe('title maths (Mexico 2026)', () => {
  it('counts races and sprints still to run', () => {
    expect(maxPointsAfter(MEXICO_2026_CALENDAR, 19)).toBe(100); // four races, no sprint left
    expect(maxPointsAfter(MEXICO_2026_CALENDAR, 16)).toBe(25 * 7 + 8);
  });

  it('settles the title at Mexico, not at Austin', () => {
    const decider = findTitleDecider(MEXICO_2026_CALENDAR, MEXICO_2026_ROUND_POINTS);
    expect(decider).toMatchObject({
      championId: 'antonelli',
      round: 19,
      date: '2026-11-01',
      championPoints: 380,
      rivalId: 'max_verstappen',
      rivalPoints: 261,
      pointsLeft: 100,
      racesLeft: 4,
    });
  });

  it('keeps the title open while any rival is within reach', () => {
    // After Austin Russell was 123 behind with 125 points left.
    expect(findTitleDecider(MEXICO_2026_CALENDAR, MEXICO_2026_ROUND_POINTS.slice(0, 18))).toBeNull();
  });

  it('never calls a tie on points decided', () => {
    const calendar = [
      { round: 1, date: '2030-03-01', raceName: 'A', hasSprint: false },
      { round: 2, date: '2030-03-08', raceName: 'B', hasSprint: false },
    ];
    const rounds = [{ round: 1, points: new Map([['x', 25], ['y', 0]]) }];
    expect(findTitleDecider(calendar, rounds)).toBeNull();
  });
});

describe('champion age', () => {
  it('measures years and days on the deciding day', () => {
    expect(ageOn('2006-08-25', '2026-11-01')).toEqual({ years: 20, days: 68 });
    expect(ageOn('1987-07-03', '2010-11-14')).toEqual({ years: 23, days: 134 }); // Vettel 2010
    expect(ageOn('1985-01-07', '2008-11-02')).toEqual({ years: 23, days: 300 }); // Hamilton 2008
  });

  it('ranks Antonelli as the youngest champion, ahead of Vettel 2010 and Hamilton 2008', () => {
    const cmp = compareChampionAge(2026, 'Kimi Antonelli', { years: 20, days: 68 }, records);
    expect(cmp.rank).toBe(1);
    expect(cmp.previousYoungest).toMatchObject({ season: 2010, name: 'Sebastian Vettel', age: { years: 23, days: 134 } });
    expect(cmp.top.map((c) => c.season)).toEqual([2026, 2010, 2008, 2005, 2021]);
  });

  it('has one decided record per finished season since 1950', () => {
    expect(records[0].season).toBe(1950);
    expect(new Set(records.map((r) => r.season)).size).toBe(records.length);
    expect(records.every((r) => r.season < 2026)).toBe(true);
  });
});
