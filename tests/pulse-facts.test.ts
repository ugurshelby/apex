import { describe, expect, it } from 'vitest';
import { getRaceResultRows } from '@/lib/f1/mrdata';
import { buildLapPositions, buildRaceControlSnapshot } from '@/lib/f1/raceEvents';
import type { OpenF1Driver } from '@/lib/f1/sources/openf1';
import { buildRaceFacts } from '@/lib/pulse/facts';
import fixture from './fixtures/mexico-2026-openf1.json';
import { MEXICO_2026_RESULTS } from './fixtures/mexico-2026';

const SESSION = 11404;
const rows = getRaceResultRows(MEXICO_2026_RESULTS);
const raceControl = buildRaceControlSnapshot({
  season: 2026,
  round: 19,
  sessionKey: SESSION,
  sessionEnd: '2026-11-01T22:23:54Z',
  messages: fixture.raceControl,
});
const lapPositions = buildLapPositions({
  season: 2026,
  round: 19,
  sessionKey: SESSION,
  positions: (fixture.positions as [number, string, number][]).map(([driver_number, date, position]) => ({
    driver_number,
    date,
    position,
    session_key: SESSION,
    meeting_key: 1298,
  })),
  laps: (fixture.laps as [number, number, string | null, number | null][]).map(([driver_number, lap_number, date_start, lap_duration]) => ({
    driver_number,
    lap_number,
    date_start,
    lap_duration,
    is_pit_out_lap: null,
    session_key: SESSION,
  })),
  roster: (fixture.drivers as [number, string][]).map(([driver_number, name_acronym]) => ({ driver_number, name_acronym })) as OpenF1Driver[],
});

describe('race facts (Mexico 2026)', () => {
  const facts = buildRaceFacts({ rows, raceControl, lapPositions });
  const penalty = (code: string) => facts.penalties.find((p) => p.driver.code === code);

  it('keeps the classification facts', () => {
    expect(facts.summary?.winner).toMatchObject({ driverName: 'Max Verstappen', grid: 5 });
    expect(facts.summary?.biggestGain).toMatchObject({ driverName: 'Liam Lawson', grid: 22, position: 7, gain: 15 });
    expect(facts.retirements.map((r) => r.driver.code)).toEqual(['LIN', 'BEA', 'BOT', 'STR', 'ALO']);
  });

  it('puts the VSC, both safety cars and the red flag on their laps', () => {
    expect(facts.neutralisations).toEqual([
      { kind: 'vsc', startLap: 7, endLap: 8 },
      { kind: 'safety_car', startLap: 44, endLap: 45 },
      { kind: 'red_flag', startLap: 45, endLap: 46 },
      { kind: 'safety_car', startLap: 59, endLap: 62 },
    ]);
  });

  it('lists the stewards penalties with seconds, lap and reason', () => {
    expect(penalty('LEC')).toMatchObject({ kind: 'time', seconds: 5, issuedLap: 12, servedLap: 30, postRace: false });
    expect(penalty('LEC')?.reason).toMatch(/LEAVING THE TRACK/);
    expect(penalty('RUS')).toMatchObject({ seconds: 10, issuedLap: 13, servedLap: 37 });
    expect(penalty('RUS')?.reason).toMatch(/CAUSING A COLLISION/);
    expect(penalty('HUL')).toMatchObject({ seconds: 10, issuedLap: 51, servedLap: 70 });
    expect(penalty('PER')).toMatchObject({ seconds: 5, issuedLap: 46 });
  });

  it('flags the Hamilton and Leclerc contact as a team incident', () => {
    const contact = facts.incidents.find((i) => i.turn === 4 && i.drivers.some((d) => d.code === 'HAM'));
    expect(contact).toMatchObject({ lap: 3, outcome: 'penalty', teammates: true });
    expect(contact?.drivers.map((d) => d.code)).toEqual(['HAM', 'LEC']);
    expect(facts.incidents.filter((i) => i.teammates)).toHaveLength(1);
  });

  it('keeps cases the stewards left for after the race', () => {
    const afterRace = facts.incidents.filter((i) => i.outcome === 'after_race');
    expect(afterRace.some((i) => i.drivers.map((d) => d.code).join() === 'PIA,LIN')).toBe(true);
  });

  it('finds the lead changes and the winner among the leaders', () => {
    expect(facts.leadChanges.length).toBeGreaterThan(0);
    expect(facts.lapsLed[0] && facts.lapsLed.reduce((n, l) => n + l.laps, 0)).toBe(71);
    expect(facts.lapsLed.map((l) => l.driver.code)).toContain('VER');
  });

  it('degrades to the classification alone without OpenF1 data', () => {
    const bare = buildRaceFacts({ rows, raceControl: null, lapPositions: null });
    expect(bare.summary?.winner.driverName).toBe('Max Verstappen');
    expect(bare).toMatchObject({ neutralisations: [], penalties: [], incidents: [], leadChanges: [], lapsLed: [] });
  });
});
