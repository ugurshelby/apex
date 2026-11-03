/**
 * Title decision for the live season (Faz 21.0, champion band): reads the
 * calendar, every finished round's race and sprint classification and the
 * driver standings, then runs the pure maths in lib/pulse/championship.ts.
 * Only the points of the current rules are modelled, so callers use it for
 * CURRENT_SEASON; finished seasons come from data/records/champions.json.
 */

import { cache } from 'react';
import championRecords from '@/data/records/champions.json';
import {
  fetchAllRoundResults,
  fetchAllRoundSprints,
  fetchSeasonSnapshotTyped,
  type MrData,
} from '@/lib/data/f1';
import { getDriverStandings, getRacesFromCalendar } from '@/lib/f1/mrdata';
import {
  ageOn,
  compareChampionAge,
  findTitleDecider,
  type Age,
  type CalendarRound,
  type ChampionRecord,
  type RoundPoints,
  type YoungestComparison,
} from '@/lib/pulse/championship';

export interface TitleDecision {
  season: number;
  driverId: string;
  driverName: string;
  familyName: string;
  permanentNumber: string | null;
  constructorName: string;
  /** Deciding round. */
  round: number;
  raceName: string;
  date: string;
  /** Points of the champion and the nearest rival after the deciding round. */
  points: number;
  rivalName: string;
  rivalPoints: number;
  /** Races left after the deciding round and the most points they were worth. */
  racesLeft: number;
  pointsLeft: number;
  /** Null when the birth date is missing upstream. */
  age: Age | null;
  youngest: YoungestComparison | null;
}

interface RawRow {
  points?: string;
  Driver?: { driverId?: string; dateOfBirth?: string };
}

function rowsOf(data: MrData, key: 'Results' | 'SprintResults'): RawRow[] {
  const races = (data.MRData as { RaceTable?: { Races?: Array<Record<string, unknown>> } } | undefined)?.RaceTable?.Races;
  const rows = races?.[0]?.[key];
  return Array.isArray(rows) ? (rows as RawRow[]) : [];
}

export const getTitleDecision = cache(async function getTitleDecision(season: number): Promise<TitleDecision | null> {
  const [calendarData, standingsData] = await Promise.all([
    fetchSeasonSnapshotTyped(season, 'calendar'),
    fetchSeasonSnapshotTyped(season, 'standings_drivers'),
  ]);
  const races = getRacesFromCalendar(calendarData);
  const calendar: CalendarRound[] = races
    .map((r) => ({ round: Number(r.round), date: r.date ?? '', raceName: r.raceName ?? '', hasSprint: Boolean(r.Sprint) }))
    .filter((r) => Number.isFinite(r.round) && r.round > 0 && r.date);
  if (calendar.length === 0) return null;

  const [results, sprints] = await Promise.all([fetchAllRoundResults(season, races), fetchAllRoundSprints(season, races)]);
  const perRound = new Map<number, Map<string, number>>();
  const birthDates = new Map<string, string>();
  const add = (round: number, rows: RawRow[]) => {
    const points = perRound.get(round) ?? new Map<string, number>();
    for (const row of rows) {
      const id = row.Driver?.driverId;
      if (!id) continue;
      points.set(id, (points.get(id) ?? 0) + (Number(row.points) || 0));
      if (row.Driver?.dateOfBirth) birthDates.set(id, row.Driver.dateOfBirth);
    }
    perRound.set(round, points);
  };
  for (const r of results) add(r.round, rowsOf(r.data, 'Results'));
  for (const s of sprints) add(s.round, rowsOf(s.data, 'SprintResults'));
  const rounds: RoundPoints[] = [...perRound].map(([round, points]) => ({ round, points }));

  const decider = findTitleDecider(calendar, rounds);
  if (!decider) return null;

  const standings = getDriverStandings(standingsData);
  const champion = standings.find((s) => s.driverId === decider.championId);
  // Standings and classifications disagree (one of them is late): show nothing rather than a wrong champion.
  if (!champion || standings[0]?.driverId !== decider.championId) return null;
  const rival = standings.find((s) => s.driverId === decider.rivalId);

  const dob = birthDates.get(decider.championId);
  const age = dob ? ageOn(dob, decider.date) : null;
  const youngest = age
    ? compareChampionAge(season, champion.driverName, age, championRecords.seasons as ChampionRecord[])
    : null;

  return {
    season,
    driverId: champion.driverId,
    driverName: champion.driverName,
    familyName: champion.familyName,
    permanentNumber: champion.permanentNumber,
    constructorName: champion.constructorName,
    round: decider.round,
    raceName: decider.raceName,
    date: decider.date,
    points: decider.championPoints,
    rivalName: rival?.driverName ?? decider.rivalId,
    rivalPoints: decider.rivalPoints,
    racesLeft: decider.racesLeft,
    pointsLeft: decider.pointsLeft,
    age,
    youngest,
  };
});
