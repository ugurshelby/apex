/**
 * Mexico City GP 2026 (R19), the race that settled Antonelli's title: real rows
 * read 2026-11-03 from `f1_snapshots` (Jolpica). Kept as the Faz 21 regression fixture.
 */

import type { CalendarRound, RoundPoints } from '@/lib/pulse/championship';

export const MEXICO_2026_CALENDAR: CalendarRound[] = [
  { round: 1, date: '2026-03-08', raceName: 'Australian Grand Prix', hasSprint: false },
  { round: 2, date: '2026-03-15', raceName: 'Chinese Grand Prix', hasSprint: true },
  { round: 3, date: '2026-03-29', raceName: 'Japanese Grand Prix', hasSprint: false },
  { round: 4, date: '2026-05-03', raceName: 'Miami Grand Prix', hasSprint: true },
  { round: 5, date: '2026-05-24', raceName: 'Canadian Grand Prix', hasSprint: true },
  { round: 6, date: '2026-06-07', raceName: 'Monaco Grand Prix', hasSprint: false },
  { round: 7, date: '2026-06-14', raceName: 'Barcelona Grand Prix', hasSprint: false },
  { round: 8, date: '2026-06-28', raceName: 'Austrian Grand Prix', hasSprint: false },
  { round: 9, date: '2026-07-05', raceName: 'British Grand Prix', hasSprint: true },
  { round: 10, date: '2026-07-19', raceName: 'Belgian Grand Prix', hasSprint: false },
  { round: 11, date: '2026-07-26', raceName: 'Hungarian Grand Prix', hasSprint: false },
  { round: 12, date: '2026-08-23', raceName: 'Dutch Grand Prix', hasSprint: true },
  { round: 13, date: '2026-09-06', raceName: 'Italian Grand Prix', hasSprint: false },
  { round: 14, date: '2026-09-13', raceName: 'Spanish Grand Prix', hasSprint: false },
  { round: 15, date: '2026-09-26', raceName: 'Azerbaijan Grand Prix', hasSprint: false },
  { round: 16, date: '2026-10-04', raceName: 'Bahrain Grand Prix in Malaysia', hasSprint: false },
  { round: 17, date: '2026-10-11', raceName: 'Singapore Grand Prix', hasSprint: true },
  { round: 18, date: '2026-10-25', raceName: 'United States Grand Prix', hasSprint: false },
  { round: 19, date: '2026-11-01', raceName: 'Mexico City Grand Prix', hasSprint: false },
  { round: 20, date: '2026-11-08', raceName: 'Brazilian Grand Prix', hasSprint: false },
  { round: 21, date: '2026-11-22', raceName: 'Las Vegas Grand Prix', hasSprint: false },
  { round: 22, date: '2026-11-29', raceName: 'Qatar Grand Prix', hasSprint: false },
  { round: 23, date: '2026-12-06', raceName: 'Abu Dhabi Grand Prix', hasSprint: false },
];

/** Race + sprint points per round for the title contenders (rounds 1-19). */
export const MEXICO_2026_ROUND_POINTS: RoundPoints[] = [
  { round: 1, points: new Map([['antonelli', 18], ['hamilton', 12], ['leclerc', 15], ['max_verstappen', 8], ['norris', 10], ['piastri', 0], ['russell', 25]]) },
  { round: 2, points: new Map([['antonelli', 29], ['hamilton', 21], ['leclerc', 19], ['max_verstappen', 0], ['norris', 5], ['piastri', 3], ['russell', 26]]) },
  { round: 3, points: new Map([['antonelli', 25], ['hamilton', 8], ['leclerc', 15], ['max_verstappen', 4], ['norris', 10], ['piastri', 18], ['russell', 12]]) },
  { round: 4, points: new Map([['antonelli', 28], ['hamilton', 10], ['leclerc', 10], ['max_verstappen', 14], ['norris', 26], ['piastri', 22], ['russell', 17]]) },
  { round: 5, points: new Map([['antonelli', 31], ['hamilton', 21], ['leclerc', 16], ['max_verstappen', 17], ['norris', 7], ['piastri', 5], ['russell', 8]]) },
  { round: 6, points: new Map([['antonelli', 25], ['hamilton', 18], ['leclerc', 0], ['max_verstappen', 0], ['norris', 0], ['piastri', 12], ['russell', 0]]) },
  { round: 7, points: new Map([['antonelli', 0], ['hamilton', 25], ['leclerc', 0], ['max_verstappen', 12], ['norris', 15], ['piastri', 10], ['russell', 18]]) },
  { round: 8, points: new Map([['antonelli', 15], ['hamilton', 10], ['leclerc', 4], ['max_verstappen', 18], ['norris', 6], ['piastri', 12], ['russell', 25]]) },
  { round: 9, points: new Map([['antonelli', 8], ['hamilton', 22], ['leclerc', 29], ['max_verstappen', 3], ['norris', 18], ['piastri', 2], ['russell', 23]]) },
  { round: 10, points: new Map([['antonelli', 25], ['hamilton', 12], ['leclerc', 18], ['max_verstappen', 15], ['norris', 6], ['piastri', 10], ['russell', 0]]) },
  { round: 11, points: new Map([['antonelli', 15], ['hamilton', 10], ['leclerc', 12], ['max_verstappen', 18], ['norris', 25], ['piastri', 0], ['russell', 6]]) },
  { round: 12, points: new Map([['antonelli', 23], ['hamilton', 14], ['leclerc', 17], ['max_verstappen', 3], ['norris', 31], ['piastri', 12], ['russell', 23]]) },
  { round: 13, points: new Map([['antonelli', 25], ['hamilton', 8], ['leclerc', 0], ['max_verstappen', 15], ['norris', 12], ['piastri', 10], ['russell', 18]]) },
  { round: 14, points: new Map([['antonelli', 25], ['hamilton', 0], ['leclerc', 12], ['max_verstappen', 18], ['norris', 15], ['piastri', 4], ['russell', 10]]) },
  { round: 15, points: new Map([['antonelli', 10], ['hamilton', 8], ['leclerc', 12], ['max_verstappen', 18], ['norris', 0], ['piastri', 0], ['russell', 25]]) },
  { round: 16, points: new Map([['antonelli', 18], ['hamilton', 15], ['leclerc', 12], ['max_verstappen', 25], ['norris', 2], ['piastri', 8], ['russell', 0]]) },
  { round: 17, points: new Map([['antonelli', 20], ['hamilton', 15], ['leclerc', 24], ['max_verstappen', 33], ['norris', 13], ['piastri', 10], ['russell', 2]]) },
  { round: 18, points: new Map([['antonelli', 25], ['hamilton', 12], ['leclerc', 18], ['max_verstappen', 15], ['norris', 10], ['piastri', 6], ['russell', 4]]) },
  { round: 19, points: new Map([['antonelli', 15], ['hamilton', 18], ['leclerc', 12], ['max_verstappen', 25], ['norris', 10], ['piastri', 0], ['russell', 8]]) },
];

/** R19 `results` snapshot in Jolpica shape (fields the site reads). */
export const MEXICO_2026_RESULTS = {
  MRData: {
    RaceTable: {
      season: '2026',
      round: '19',
      Races: [
        {
          season: '2026',
          round: '19',
          raceName: 'Mexico City Grand Prix',
          date: '2026-11-01',
          Results: [
            { position: '1', grid: '5', points: '25', status: 'Finished', FastestLap: { rank: '2' }, Driver: { driverId: 'max_verstappen', givenName: 'Max', familyName: 'Verstappen' }, Constructor: { name: 'Red Bull' } },
            { position: '2', grid: '1', points: '18', status: 'Finished', FastestLap: { rank: '1' }, Driver: { driverId: 'hamilton', givenName: 'Lewis', familyName: 'Hamilton' }, Constructor: { name: 'Ferrari' } },
            { position: '3', grid: '4', points: '15', status: 'Finished', FastestLap: { rank: '3' }, Driver: { driverId: 'antonelli', givenName: 'Andrea Kimi', familyName: 'Antonelli' }, Constructor: { name: 'Mercedes' } },
            { position: '4', grid: '3', points: '12', status: 'Finished', FastestLap: { rank: '5' }, Driver: { driverId: 'leclerc', givenName: 'Charles', familyName: 'Leclerc' }, Constructor: { name: 'Ferrari' } },
            { position: '5', grid: '6', points: '10', status: 'Finished', FastestLap: { rank: '4' }, Driver: { driverId: 'norris', givenName: 'Lando', familyName: 'Norris' }, Constructor: { name: 'McLaren' } },
            { position: '6', grid: '2', points: '8', status: 'Finished', FastestLap: { rank: '6' }, Driver: { driverId: 'russell', givenName: 'George', familyName: 'Russell' }, Constructor: { name: 'Mercedes' } },
            { position: '7', grid: '22', points: '6', status: 'Finished', FastestLap: { rank: '10' }, Driver: { driverId: 'lawson', givenName: 'Liam', familyName: 'Lawson' }, Constructor: { name: 'RB F1 Team' } },
            { position: '8', grid: '13', points: '4', status: 'Finished', FastestLap: { rank: '14' }, Driver: { driverId: 'bortoleto', givenName: 'Gabriel', familyName: 'Bortoleto' }, Constructor: { name: 'Audi' } },
            { position: '9', grid: '7', points: '2', status: 'Finished', FastestLap: { rank: '7' }, Driver: { driverId: 'hadjar', givenName: 'Isack', familyName: 'Hadjar' }, Constructor: { name: 'Red Bull' } },
            { position: '10', grid: '18', points: '1', status: 'Finished', FastestLap: { rank: '15' }, Driver: { driverId: 'ryo_hirakawa', givenName: 'Ryo', familyName: 'Hirakawa' }, Constructor: { name: 'Haas F1 Team' } },
            { position: '11', grid: '16', points: '0', status: 'Finished', FastestLap: { rank: '17' }, Driver: { driverId: 'albon', givenName: 'Alexander', familyName: 'Albon' }, Constructor: { name: 'Williams' } },
            { position: '12', grid: '15', points: '0', status: 'Finished', FastestLap: { rank: '19' }, Driver: { driverId: 'sainz', givenName: 'Carlos', familyName: 'Sainz' }, Constructor: { name: 'Williams' } },
            { position: '13', grid: '12', points: '0', status: 'Finished', FastestLap: { rank: '9' }, Driver: { driverId: 'piastri', givenName: 'Oscar', familyName: 'Piastri' }, Constructor: { name: 'McLaren' } },
            { position: '14', grid: '10', points: '0', status: 'Finished', FastestLap: { rank: '11' }, Driver: { driverId: 'hulkenberg', givenName: 'Nico', familyName: 'Hülkenberg' }, Constructor: { name: 'Audi' } },
            { position: '15', grid: '11', points: '0', status: 'Finished', FastestLap: { rank: '12' }, Driver: { driverId: 'colapinto', givenName: 'Franco', familyName: 'Colapinto' }, Constructor: { name: 'Alpine F1 Team' } },
            { position: '16', grid: '20', points: '0', status: 'Finished', FastestLap: { rank: '18' }, Driver: { driverId: 'perez', givenName: 'Sergio', familyName: 'Pérez' }, Constructor: { name: 'Cadillac F1 Team' } },
            { position: '17', grid: '9', points: '0', status: 'Finished', FastestLap: { rank: '13' }, Driver: { driverId: 'gasly', givenName: 'Pierre', familyName: 'Gasly' }, Constructor: { name: 'Alpine F1 Team' } },
            { position: '18', grid: '8', points: '0', status: 'Retired', FastestLap: { rank: '8' }, Driver: { driverId: 'arvid_lindblad', givenName: 'Arvid', familyName: 'Lindblad' }, Constructor: { name: 'RB F1 Team' } },
            { position: '19', grid: '14', points: '0', status: 'Retired', FastestLap: { rank: '16' }, Driver: { driverId: 'bearman', givenName: 'Oliver', familyName: 'Bearman' }, Constructor: { name: 'Haas F1 Team' } },
            { position: '20', grid: '21', points: '0', status: 'Retired', FastestLap: { rank: '20' }, Driver: { driverId: 'bottas', givenName: 'Valtteri', familyName: 'Bottas' }, Constructor: { name: 'Cadillac F1 Team' } },
            { position: '21', grid: '19', points: '0', status: 'Retired', FastestLap: { rank: '22' }, Driver: { driverId: 'stroll', givenName: 'Lance', familyName: 'Stroll' }, Constructor: { name: 'Aston Martin' } },
            { position: '22', grid: '17', points: '0', status: 'Retired', FastestLap: { rank: '21' }, Driver: { driverId: 'alonso', givenName: 'Fernando', familyName: 'Alonso' }, Constructor: { name: 'Aston Martin' } },
          ],
        },
      ],
    },
  },
};
