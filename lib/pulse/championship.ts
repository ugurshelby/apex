/**
 * Drivers' title maths and the "youngest champion" comparison (Faz 21.0).
 * Pure functions: the data layer (lib/data/pulse.ts) feeds them snapshot rows.
 *
 * A title is decided after a round when the leader's lead over EVERY other
 * driver is larger than the most points still on offer (a win in every
 * remaining race and sprint). A tie on points is not counted as decided:
 * the count-back is not computed here, so the result can only be late, never early.
 */

/** Points for a Grand Prix win and a sprint win (2026 rules: no fastest-lap point). */
export const RACE_WIN_POINTS = 25;
export const SPRINT_WIN_POINTS = 8;

export interface CalendarRound {
  round: number;
  date: string;
  raceName: string;
  hasSprint: boolean;
}

/** Points scored per driver in one round (race + sprint). */
export interface RoundPoints {
  round: number;
  points: ReadonlyMap<string, number>;
}

export function maxPointsAfter(calendar: readonly CalendarRound[], round: number): number {
  return calendar
    .filter((r) => r.round > round)
    .reduce((sum, r) => sum + RACE_WIN_POINTS + (r.hasSprint ? SPRINT_WIN_POINTS : 0), 0);
}

export interface TitleDecider {
  championId: string;
  round: number;
  date: string;
  raceName: string;
  /** Standing after the deciding round. */
  championPoints: number;
  rivalId: string;
  rivalPoints: number;
  /** Most points still available after the deciding round. */
  pointsLeft: number;
  racesLeft: number;
}

/** The first round after which the title could no longer be lost; null while it is open. */
export function findTitleDecider(calendar: readonly CalendarRound[], rounds: readonly RoundPoints[]): TitleDecider | null {
  const totals = new Map<string, number>();
  const byRound = [...rounds].sort((a, b) => a.round - b.round);
  for (const { round, points } of byRound) {
    for (const [id, p] of points) totals.set(id, (totals.get(id) ?? 0) + p);
    const ranked = [...totals].sort((a, b) => b[1] - a[1]);
    if (ranked.length < 2) continue;
    const [[leaderId, leaderPts], [rivalId, rivalPts]] = ranked;
    const pointsLeft = maxPointsAfter(calendar, round);
    if (leaderPts - rivalPts > pointsLeft) {
      const race = calendar.find((r) => r.round === round);
      if (!race) return null;
      return {
        championId: leaderId,
        round,
        date: race.date,
        raceName: race.raceName,
        championPoints: leaderPts,
        rivalId,
        rivalPoints: rivalPts,
        pointsLeft,
        racesLeft: calendar.filter((r) => r.round > round).length,
      };
    }
  }
  return null;
}

export interface Age {
  years: number;
  days: number;
}

/** Age in whole years plus days since the last birthday, both dates as `YYYY-MM-DD` (UTC). */
export function ageOn(dateOfBirth: string, date: string): Age {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const day = new Date(`${date}T00:00:00Z`);
  const birthdayIn = (y: number) => Date.UTC(y, birth.getUTCMonth(), birth.getUTCDate());
  let years = day.getUTCFullYear() - birth.getUTCFullYear();
  if (birthdayIn(birth.getUTCFullYear() + years) > day.getTime()) years -= 1;
  const days = Math.round((day.getTime() - birthdayIn(birth.getUTCFullYear() + years)) / 86_400_000);
  return { years, days };
}

function ageKey(a: Age): number {
  return a.years * 400 + a.days;
}

export interface ChampionRecord {
  season: number;
  driverId: string;
  name: string;
  dateOfBirth: string;
  decidedRound: number;
  decidedDate: string;
}

export interface RankedChampion {
  season: number;
  name: string;
  age: Age;
  /** True for the champion being ranked (the live season). */
  current: boolean;
}

export interface YoungestComparison {
  /** 1 = youngest champion ever. */
  rank: number;
  /** Youngest champion of the other seasons: the record before this one. */
  previousYoungest: RankedChampion | null;
  /** Youngest champions overall, this one included, youngest first. */
  top: RankedChampion[];
}

/**
 * Ranks a champion's age on the deciding day against every other season's
 * champion (one entry per season; a driver with several titles appears several times).
 */
export function compareChampionAge(
  season: number,
  name: string,
  age: Age,
  records: readonly ChampionRecord[],
  topN = 5,
): YoungestComparison {
  const others: RankedChampion[] = records
    .filter((r) => r.season !== season)
    .map((r) => ({ season: r.season, name: r.name, age: ageOn(r.dateOfBirth, r.decidedDate), current: false }));
  const self: RankedChampion = { season, name, age, current: true };
  const all = [...others, self].sort((a, b) => ageKey(a.age) - ageKey(b.age) || a.season - b.season);
  const previousYoungest = [...others].sort((a, b) => ageKey(a.age) - ageKey(b.age))[0] ?? null;
  return { rank: all.indexOf(self) + 1, previousYoungest, top: all.slice(0, topN) };
}
