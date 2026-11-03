import { describe, expect, it } from 'vitest';
import { getRaceResultRows } from '@/lib/f1/mrdata';
import { buildRaceSummary, isFinisher } from '@/lib/pulse/raceSummary';
import { MEXICO_2026_RESULTS } from './fixtures/mexico-2026';

describe('race summary (Mexico 2026)', () => {
  const summary = buildRaceSummary(getRaceResultRows(MEXICO_2026_RESULTS));

  it('tells where the winner started and what became of the pole sitter', () => {
    expect(summary?.winner).toMatchObject({ driverName: 'Max Verstappen', grid: 5 });
    expect(summary?.poleSitter).toMatchObject({ driverName: 'Lewis Hamilton', position: 2, finished: true });
    expect(summary?.fastestLap?.driverName).toBe('Lewis Hamilton');
  });

  it('finds the biggest gain and every driver who did not finish', () => {
    expect(summary?.biggestGain).toMatchObject({ driverName: 'Liam Lawson', grid: 22, position: 7, gain: 15 });
    expect(summary?.dnf.map((d) => d.driverName)).toEqual([
      'Arvid Lindblad',
      'Oliver Bearman',
      'Valtteri Bottas',
      'Lance Stroll',
      'Fernando Alonso',
    ]);
  });

  it('treats lapped cars as finishers', () => {
    expect(isFinisher('+1 Lap')).toBe(true);
    expect(isFinisher('+3 Laps')).toBe(true);
    expect(isFinisher('Lapped')).toBe(true);
    expect(isFinisher('Retired')).toBe(false);
    expect(isFinisher('Disqualified')).toBe(false);
  });

  it('returns null without a classification', () => {
    expect(buildRaceSummary([])).toBeNull();
  });
});
