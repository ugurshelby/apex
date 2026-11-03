import { describe, expect, it } from 'vitest';
import { buildLapPositions, buildRaceControlSnapshot } from '@/lib/f1/raceEvents';
import { FINAL_READ_AFTER_MS, FIRST_READ_AFTER_MS, raceEventsDue } from '@/lib/f1/raceEventsSync';
import type { OpenF1Driver, OpenF1Lap, OpenF1Position, OpenF1RaceControl } from '@/lib/f1/sources/openf1';
import fixture from './fixtures/mexico-2026-openf1.json';

const SESSION = 11404;
const raceControl = fixture.raceControl as OpenF1RaceControl[];
const positions: OpenF1Position[] = (fixture.positions as [number, string, number][]).map(([driver_number, date, position]) => ({
  driver_number,
  date,
  position,
  session_key: SESSION,
  meeting_key: 1298,
}));
const laps: OpenF1Lap[] = (fixture.laps as [number, number, string | null, number | null][]).map(
  ([driver_number, lap_number, date_start, lap_duration]) => ({
    driver_number,
    lap_number,
    date_start,
    lap_duration,
    is_pit_out_lap: null,
    session_key: SESSION,
  }),
);
const roster = (fixture.drivers as [number, string][]).map(([driver_number, name_acronym]) => ({
  driver_number,
  name_acronym,
})) as OpenF1Driver[];

describe('race control snapshot (Mexico 2026)', () => {
  const snap = buildRaceControlSnapshot({ season: 2026, round: 19, sessionKey: SESSION, sessionEnd: '2026-11-01T22:23:00Z', messages: raceControl });
  const find = (re: RegExp) => snap?.messages.find((m) => re.test(m.message));

  it('keeps the race story and drops blue flags', () => {
    expect(snap?.messages.length).toBe(158);
    expect(snap?.messages.some((m) => m.flag === 'BLUE')).toBe(false);
  });

  it('carries the red flag, both safety cars and the penalties with lap numbers', () => {
    expect(find(/^RED FLAG/)?.lap).toBe(45);
    expect(snap?.messages.filter((m) => m.category === 'SafetyCar' && /^SAFETY CAR DEPLOYED/.test(m.message)).map((m) => m.lap)).toEqual([44, 59]);
    expect(find(/^VSC DEPLOYED/)?.lap).toBe(7);
    expect(find(/TURN 4 INCIDENT INVOLVING CARS 44 \(HAM\) AND 16 \(LEC\)/)?.lap).toBe(3);
    expect(find(/^FIA STEWARDS: 5 SECOND TIME PENALTY FOR CAR 16 \(LEC\)/)?.lap).toBe(12);
    expect(find(/^FIA STEWARDS: 10 SECOND TIME PENALTY FOR CAR 63 \(RUS\)/)?.lap).toBe(13);
    expect(find(/^FIA STEWARDS: 10 SECOND TIME PENALTY FOR CAR 27 \(HUL\)/)?.lap).toBe(51);
  });

  it('returns null without messages', () => {
    expect(buildRaceControlSnapshot({ season: 2026, round: 1, sessionKey: 1, sessionEnd: '', messages: [] })).toBeNull();
  });
});

describe('lap positions (Mexico 2026)', () => {
  const snap = buildLapPositions({ season: 2026, round: 19, sessionKey: SESSION, positions, laps, roster });
  const driver = (code: string) => snap?.drivers.find((d) => d.code === code);

  it('reads the grid and the order on track at the flag', () => {
    expect(snap?.laps).toBe(71);
    expect(snap?.drivers).toHaveLength(22);
    expect(driver('VER')).toMatchObject({ grid: 5 });
    expect(driver('VER')?.positions.at(-1)).toBe(1);
    expect(driver('HAM')).toMatchObject({ grid: 1 });
    expect(driver('HAM')?.positions.at(-1)).toBe(2);
    // On track Lawson took the flag 9th (+13); post-race penalties to Piastri and Colapinto made it 7th officially.
    expect(driver('LAW')).toMatchObject({ grid: 22 });
    expect(driver('LAW')?.positions.at(-1)).toBe(9);
  });

  it('stops a retired car at its last lap', () => {
    expect(driver('STR')?.positions).toHaveLength(5);
    expect(driver('BOT')?.positions).toHaveLength(42);
    expect(snap?.drivers.slice(-2).map((d) => d.code)).toEqual(['STR', 'ALO']);
  });
});

describe('race events timing', () => {
  const end = Date.parse('2026-11-01T22:23:00Z');
  const at = (ms: number) => new Date(end + ms).toISOString();

  it('waits after the flag, writes once, then once more for post-race decisions', () => {
    expect(raceEventsDue(null, end, end + FIRST_READ_AFTER_MS - 1)).toBe(false);
    expect(raceEventsDue(null, end, end + FIRST_READ_AFTER_MS)).toBe(true);
    expect(raceEventsDue(at(FIRST_READ_AFTER_MS), end, end + FIRST_READ_AFTER_MS + 60_000)).toBe(false);
    expect(raceEventsDue(at(FIRST_READ_AFTER_MS), end, end + FINAL_READ_AFTER_MS)).toBe(true);
    expect(raceEventsDue(at(FINAL_READ_AFTER_MS), end, end + FINAL_READ_AFTER_MS * 3)).toBe(false);
  });
});
