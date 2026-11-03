/**
 * Builds data/records/index.json, the history index the race pulse compares
 * live results against (Faz 21.3), from the F1DB GitHub release. Needs NO
 * secrets and NO database: it only downloads the public release zip.
 *
 *   npx tsx scripts/build-records-index.ts
 *
 * Covers every season before the newest one in the release (that one may
 * still be running; pages read it from the live snapshots):
 * - champions: each season's drivers' champion, birth date and the race that
 *   decided the title (F1DB `driversChampionshipDecider`);
 * - drivers: career counts up to the end of the covered seasons (race starts,
 *   wins, poles, podiums, scores = races and sprints with points), so a live
 *   result can tell a first win or first points;
 * - winners: youngest and oldest Grand Prix winner;
 * - seasonMostWins: most Grand Prix wins in one season.
 * Re-run after each season (PLAN D5).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';

const TAG = process.env.F1DB_TAG ?? '';
const RELEASE_API = TAG
  ? `https://api.github.com/repos/f1db/f1db/releases/tags/${TAG}`
  : 'https://api.github.com/repos/f1db/f1db/releases/latest';
const OUT_DIR = join(process.cwd(), 'data', 'records');

interface Release {
  tag_name: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

interface F1DbResult {
  driverId: string;
  positionNumber?: number | null;
  points?: number | null;
  polePosition?: boolean | null;
}

interface F1DbRace {
  year: number;
  round: number;
  date: string;
  driversChampionshipDecider?: boolean;
  driverStandings?: Array<{ positionNumber?: number | null; driverId?: string }>;
  raceResults?: F1DbResult[];
  sprintRaceResults?: F1DbResult[];
}

interface F1Db {
  drivers: Array<{ id: string; name: string; lastName: string; dateOfBirth?: string | null }>;
  races: F1DbRace[];
}

interface Counts {
  starts: number;
  wins: number;
  poles: number;
  podiums: number;
  scores: number;
}

async function loadF1Db(): Promise<{ db: F1Db; tag: string }> {
  const relRes = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'apex-records' } });
  if (!relRes.ok) throw new Error(`${RELEASE_API} -> ${relRes.status}`);
  const release = (await relRes.json()) as Release;
  const asset = release.assets.find((a) => a.name === 'f1db-json-single.zip');
  if (!asset) throw new Error('f1db-json-single.zip not in release');
  const zipRes = await fetch(asset.browser_download_url, { headers: { 'User-Agent': 'apex-records' }, redirect: 'follow' });
  if (!zipRes.ok) throw new Error(`${asset.browser_download_url} -> ${zipRes.status}`);
  const files = unzipSync(new Uint8Array(await zipRes.arrayBuffer()));
  const entry = Object.keys(files).find((k) => k.endsWith('f1db.json'));
  if (!entry) throw new Error('f1db.json not in zip');
  return { db: JSON.parse(new TextDecoder().decode(files[entry])) as F1Db, tag: release.tag_name };
}

async function main(): Promise<void> {
  const { db, tag } = await loadF1Db();
  const drivers = new Map(db.drivers.map((d) => [d.id, d]));
  const newestSeason = Math.max(...db.races.map((r) => r.year));
  const throughSeason = newestSeason - 1;
  const races = db.races.filter((r) => r.year <= throughSeason).sort((a, b) => a.year - b.year || a.round - b.round);

  const champions = races
    .filter((r) => r.driversChampionshipDecider)
    .map((r) => {
      const championId = r.driverStandings?.find((s) => s.positionNumber === 1)?.driverId;
      const driver = championId ? drivers.get(championId) : undefined;
      if (!driver?.dateOfBirth) throw new Error(`${r.year}: champion or birth date missing`);
      return { season: r.year, driverId: driver.id, name: driver.name, dateOfBirth: driver.dateOfBirth, decidedRound: r.round, decidedDate: r.date };
    });
  const seasons = new Set(races.map((r) => r.year));
  if (champions.length !== seasons.size) throw new Error(`expected ${seasons.size} decided seasons, got ${champions.length}`);

  const counts = new Map<string, Counts>();
  const countsOf = (id: string) => {
    let c = counts.get(id);
    if (!c) counts.set(id, (c = { starts: 0, wins: 0, poles: 0, podiums: 0, scores: 0 }));
    return c;
  };
  type Winner = { name: string; dateOfBirth: string; season: number; round: number; date: string; days: number };
  let youngest: Winner | null = null;
  let oldest: Winner | null = null;
  const seasonWins = new Map<string, number>();

  for (const race of races) {
    for (const r of race.raceResults ?? []) {
      const c = countsOf(r.driverId);
      c.starts++;
      if (r.positionNumber === 1) c.wins++;
      if (r.positionNumber != null && r.positionNumber <= 3) c.podiums++;
      if (r.polePosition) c.poles++;
      if ((r.points ?? 0) > 0) c.scores++;
      if (r.positionNumber === 1) {
        const key = `${race.year}|${r.driverId}`;
        seasonWins.set(key, (seasonWins.get(key) ?? 0) + 1);
        const d = drivers.get(r.driverId);
        if (d?.dateOfBirth) {
          const days = (Date.parse(`${race.date}T00:00:00Z`) - Date.parse(`${d.dateOfBirth}T00:00:00Z`)) / 86_400_000;
          const w: Winner = { name: d.name, dateOfBirth: d.dateOfBirth, season: race.year, round: race.round, date: race.date, days };
          if (!youngest || days < youngest.days) youngest = w;
          if (!oldest || days > oldest.days) oldest = w;
        }
      }
    }
    for (const r of race.sprintRaceResults ?? []) if ((r.points ?? 0) > 0) countsOf(r.driverId).scores++;
  }

  let most = { wins: 0, season: 0, driverId: '' };
  for (const [key, wins] of seasonWins) {
    const [season, driverId] = key.split('|');
    if (wins > most.wins || (wins === most.wins && Number(season) < most.season)) most = { wins, season: Number(season), driverId };
  }
  const strip = (w: Winner | null) => (w ? { name: w.name, dateOfBirth: w.dateOfBirth, season: w.season, round: w.round, date: w.date } : null);

  const driverRows = [...counts]
    .map(([id, c]) => {
      const d = drivers.get(id);
      return d?.dateOfBirth ? { id, name: d.name, lastName: d.lastName, dateOfBirth: d.dateOfBirth, ...c } : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => a.id.localeCompare(b.id));

  const out = {
    source: 'F1DB (github.com/f1db/f1db, CC BY 4.0)',
    release: tag,
    throughSeason,
    winners: { youngest: strip(youngest), oldest: strip(oldest) },
    seasonMostWins: { wins: most.wins, season: most.season, name: drivers.get(most.driverId)?.name ?? most.driverId },
    champions,
    drivers: driverRows,
  };
  // One driver or champion per line: readable diffs when the index is rebuilt after a season.
  const json = JSON.stringify(out, null, 2)
    .replace(/\{\n\s+"(season|id)"[\s\S]*?\n\s+\}/g, (block) => block.replace(/\n\s+/g, ' ').replace(/\{ /, '{').replace(/ \}$/, '}'));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'index.json'), `${json}\n`);
  console.log(
    `index.json: ${champions.length} champions, ${driverRows.length} drivers, through ${throughSeason}, ${tag}; ` +
      `most wins ${out.seasonMostWins.wins} (${out.seasonMostWins.name} ${out.seasonMostWins.season})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
