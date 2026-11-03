/**
 * Builds data/records/champions.json from the F1DB GitHub release: every
 * finished season's drivers' champion, their birth date and the race that
 * decided the title (F1DB `driversChampionshipDecider`). Needs NO secrets and
 * NO database: it only downloads the public release zip.
 *
 *   npx tsx scripts/build-champion-records.ts
 *
 * The newest season in the release is left out: it may still be running, so
 * pages compute it from the live snapshots (lib/pulse/championship.ts).
 * Re-run after each season (PLAN D5); Faz 21.3 folds this into the records index.
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

interface F1DbStanding {
  positionNumber?: number | null;
  driverId?: string;
}

interface F1Db {
  drivers: Array<{ id: string; name: string; dateOfBirth?: string | null }>;
  races: Array<{
    year: number;
    round: number;
    date: string;
    driversChampionshipDecider?: boolean;
    driverStandings?: F1DbStanding[];
  }>;
}

async function main(): Promise<void> {
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
  const db = JSON.parse(new TextDecoder().decode(files[entry])) as F1Db;

  const drivers = new Map(db.drivers.map((d) => [d.id, d]));
  const newestSeason = Math.max(...db.races.map((r) => r.year));
  const seasons = db.races
    .filter((r) => r.driversChampionshipDecider && r.year < newestSeason)
    .map((r) => {
      const championId = r.driverStandings?.find((s) => s.positionNumber === 1)?.driverId;
      const driver = championId ? drivers.get(championId) : undefined;
      if (!driver?.dateOfBirth) throw new Error(`${r.year}: champion or birth date missing`);
      return {
        season: r.year,
        driverId: driver.id,
        name: driver.name,
        dateOfBirth: driver.dateOfBirth,
        decidedRound: r.round,
        decidedDate: r.date,
      };
    })
    .sort((a, b) => a.season - b.season);

  const expected = newestSeason - Math.min(...db.races.map((r) => r.year));
  if (seasons.length !== expected) throw new Error(`expected ${expected} decided seasons, got ${seasons.length}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const out = { source: 'F1DB (github.com/f1db/f1db, CC BY 4.0)', release: release.tag_name, seasons };
  writeFileSync(join(OUT_DIR, 'champions.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`champions.json: ${seasons.length} seasons (${seasons[0]?.season}-${seasons.at(-1)?.season}), ${release.tag_name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
