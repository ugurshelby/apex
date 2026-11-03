/**
 * 2008 and 2010 title fights (the youngest-champion records before 2026): calendar and
 * points per round of the contenders, from F1DB v2026.19.0 (read 2026-11-03).
 */

import type { CalendarRound, RoundPoints } from '@/lib/pulse/championship';

export const CALENDAR_2008: CalendarRound[] = [
  { round: 1, date: '2008-03-16', raceName: 'Australian Grand Prix', hasSprint: false },
  { round: 2, date: '2008-03-23', raceName: 'Malaysian Grand Prix', hasSprint: false },
  { round: 3, date: '2008-04-06', raceName: 'Bahrain Grand Prix', hasSprint: false },
  { round: 4, date: '2008-04-27', raceName: 'Spanish Grand Prix', hasSprint: false },
  { round: 5, date: '2008-05-11', raceName: 'Turkish Grand Prix', hasSprint: false },
  { round: 6, date: '2008-05-25', raceName: 'Monaco Grand Prix', hasSprint: false },
  { round: 7, date: '2008-06-08', raceName: 'Canadian Grand Prix', hasSprint: false },
  { round: 8, date: '2008-06-22', raceName: 'French Grand Prix', hasSprint: false },
  { round: 9, date: '2008-07-06', raceName: 'British Grand Prix', hasSprint: false },
  { round: 10, date: '2008-07-20', raceName: 'German Grand Prix', hasSprint: false },
  { round: 11, date: '2008-08-03', raceName: 'Hungarian Grand Prix', hasSprint: false },
  { round: 12, date: '2008-08-24', raceName: 'European Grand Prix', hasSprint: false },
  { round: 13, date: '2008-09-07', raceName: 'Belgian Grand Prix', hasSprint: false },
  { round: 14, date: '2008-09-14', raceName: 'Italian Grand Prix', hasSprint: false },
  { round: 15, date: '2008-09-28', raceName: 'Singapore Grand Prix', hasSprint: false },
  { round: 16, date: '2008-10-12', raceName: 'Japanese Grand Prix', hasSprint: false },
  { round: 17, date: '2008-10-19', raceName: 'Chinese Grand Prix', hasSprint: false },
  { round: 18, date: '2008-11-02', raceName: 'Brazilian Grand Prix', hasSprint: false },
];

export const POINTS_2008: RoundPoints[] = [
  { round: 1, points: new Map([['lewis-hamilton', 10], ['felipe-massa', 0], ['kimi-raikkonen', 1], ['robert-kubica', 0]]) },
  { round: 2, points: new Map([['lewis-hamilton', 4], ['felipe-massa', 0], ['kimi-raikkonen', 10], ['robert-kubica', 8]]) },
  { round: 3, points: new Map([['lewis-hamilton', 0], ['felipe-massa', 10], ['kimi-raikkonen', 8], ['robert-kubica', 6]]) },
  { round: 4, points: new Map([['lewis-hamilton', 6], ['felipe-massa', 8], ['kimi-raikkonen', 10], ['robert-kubica', 5]]) },
  { round: 5, points: new Map([['lewis-hamilton', 8], ['felipe-massa', 10], ['kimi-raikkonen', 6], ['robert-kubica', 5]]) },
  { round: 6, points: new Map([['lewis-hamilton', 10], ['felipe-massa', 6], ['kimi-raikkonen', 0], ['robert-kubica', 8]]) },
  { round: 7, points: new Map([['lewis-hamilton', 0], ['felipe-massa', 4], ['kimi-raikkonen', 0], ['robert-kubica', 10]]) },
  { round: 8, points: new Map([['lewis-hamilton', 0], ['felipe-massa', 10], ['kimi-raikkonen', 8], ['robert-kubica', 4]]) },
  { round: 9, points: new Map([['lewis-hamilton', 10], ['felipe-massa', 0], ['kimi-raikkonen', 5], ['robert-kubica', 0]]) },
  { round: 10, points: new Map([['lewis-hamilton', 10], ['felipe-massa', 6], ['kimi-raikkonen', 3], ['robert-kubica', 2]]) },
  { round: 11, points: new Map([['lewis-hamilton', 4], ['felipe-massa', 0], ['kimi-raikkonen', 6], ['robert-kubica', 1]]) },
  { round: 12, points: new Map([['lewis-hamilton', 8], ['felipe-massa', 10], ['kimi-raikkonen', 0], ['robert-kubica', 6]]) },
  { round: 13, points: new Map([['lewis-hamilton', 6], ['felipe-massa', 10], ['kimi-raikkonen', 0], ['robert-kubica', 3]]) },
  { round: 14, points: new Map([['lewis-hamilton', 2], ['felipe-massa', 3], ['kimi-raikkonen', 0], ['robert-kubica', 6]]) },
  { round: 15, points: new Map([['lewis-hamilton', 6], ['felipe-massa', 0], ['kimi-raikkonen', 0], ['robert-kubica', 0]]) },
  { round: 16, points: new Map([['lewis-hamilton', 0], ['felipe-massa', 2], ['kimi-raikkonen', 6], ['robert-kubica', 8]]) },
  { round: 17, points: new Map([['lewis-hamilton', 10], ['felipe-massa', 8], ['kimi-raikkonen', 6], ['robert-kubica', 3]]) },
  { round: 18, points: new Map([['lewis-hamilton', 4], ['felipe-massa', 10], ['kimi-raikkonen', 6], ['robert-kubica', 0]]) },
];

export const CALENDAR_2010: CalendarRound[] = [
  { round: 1, date: '2010-03-14', raceName: 'Bahrain Grand Prix', hasSprint: false },
  { round: 2, date: '2010-03-28', raceName: 'Australian Grand Prix', hasSprint: false },
  { round: 3, date: '2010-04-04', raceName: 'Malaysian Grand Prix', hasSprint: false },
  { round: 4, date: '2010-04-18', raceName: 'Chinese Grand Prix', hasSprint: false },
  { round: 5, date: '2010-05-09', raceName: 'Spanish Grand Prix', hasSprint: false },
  { round: 6, date: '2010-05-16', raceName: 'Monaco Grand Prix', hasSprint: false },
  { round: 7, date: '2010-05-30', raceName: 'Turkish Grand Prix', hasSprint: false },
  { round: 8, date: '2010-06-13', raceName: 'Canadian Grand Prix', hasSprint: false },
  { round: 9, date: '2010-06-27', raceName: 'European Grand Prix', hasSprint: false },
  { round: 10, date: '2010-07-11', raceName: 'British Grand Prix', hasSprint: false },
  { round: 11, date: '2010-07-25', raceName: 'German Grand Prix', hasSprint: false },
  { round: 12, date: '2010-08-01', raceName: 'Hungarian Grand Prix', hasSprint: false },
  { round: 13, date: '2010-08-29', raceName: 'Belgian Grand Prix', hasSprint: false },
  { round: 14, date: '2010-09-12', raceName: 'Italian Grand Prix', hasSprint: false },
  { round: 15, date: '2010-09-26', raceName: 'Singapore Grand Prix', hasSprint: false },
  { round: 16, date: '2010-10-10', raceName: 'Japanese Grand Prix', hasSprint: false },
  { round: 17, date: '2010-10-24', raceName: 'Korean Grand Prix', hasSprint: false },
  { round: 18, date: '2010-11-07', raceName: 'Brazilian Grand Prix', hasSprint: false },
  { round: 19, date: '2010-11-14', raceName: 'Abu Dhabi Grand Prix', hasSprint: false },
];

export const POINTS_2010: RoundPoints[] = [
  { round: 1, points: new Map([['sebastian-vettel', 12], ['fernando-alonso', 25], ['mark-webber', 4], ['lewis-hamilton', 15], ['jenson-button', 6]]) },
  { round: 2, points: new Map([['sebastian-vettel', 0], ['fernando-alonso', 12], ['mark-webber', 2], ['lewis-hamilton', 8], ['jenson-button', 25]]) },
  { round: 3, points: new Map([['sebastian-vettel', 25], ['fernando-alonso', 0], ['mark-webber', 18], ['lewis-hamilton', 8], ['jenson-button', 4]]) },
  { round: 4, points: new Map([['sebastian-vettel', 8], ['fernando-alonso', 12], ['mark-webber', 4], ['lewis-hamilton', 18], ['jenson-button', 25]]) },
  { round: 5, points: new Map([['sebastian-vettel', 15], ['fernando-alonso', 18], ['mark-webber', 25], ['lewis-hamilton', 0], ['jenson-button', 10]]) },
  { round: 6, points: new Map([['sebastian-vettel', 18], ['fernando-alonso', 8], ['mark-webber', 25], ['lewis-hamilton', 10], ['jenson-button', 0]]) },
  { round: 7, points: new Map([['sebastian-vettel', 0], ['fernando-alonso', 4], ['mark-webber', 15], ['lewis-hamilton', 25], ['jenson-button', 18]]) },
  { round: 8, points: new Map([['sebastian-vettel', 12], ['fernando-alonso', 15], ['mark-webber', 10], ['lewis-hamilton', 25], ['jenson-button', 18]]) },
  { round: 9, points: new Map([['sebastian-vettel', 25], ['fernando-alonso', 4], ['mark-webber', 0], ['lewis-hamilton', 18], ['jenson-button', 15]]) },
  { round: 10, points: new Map([['sebastian-vettel', 6], ['fernando-alonso', 0], ['mark-webber', 25], ['lewis-hamilton', 18], ['jenson-button', 12]]) },
  { round: 11, points: new Map([['sebastian-vettel', 15], ['fernando-alonso', 25], ['mark-webber', 8], ['lewis-hamilton', 12], ['jenson-button', 10]]) },
  { round: 12, points: new Map([['sebastian-vettel', 15], ['fernando-alonso', 18], ['mark-webber', 25], ['lewis-hamilton', 0], ['jenson-button', 4]]) },
  { round: 13, points: new Map([['sebastian-vettel', 0], ['fernando-alonso', 0], ['mark-webber', 18], ['lewis-hamilton', 25], ['jenson-button', 0]]) },
  { round: 14, points: new Map([['sebastian-vettel', 12], ['fernando-alonso', 25], ['mark-webber', 8], ['lewis-hamilton', 0], ['jenson-button', 18]]) },
  { round: 15, points: new Map([['sebastian-vettel', 18], ['fernando-alonso', 25], ['mark-webber', 15], ['lewis-hamilton', 0], ['jenson-button', 12]]) },
  { round: 16, points: new Map([['sebastian-vettel', 25], ['fernando-alonso', 15], ['mark-webber', 18], ['lewis-hamilton', 10], ['jenson-button', 12]]) },
  { round: 17, points: new Map([['sebastian-vettel', 0], ['fernando-alonso', 25], ['mark-webber', 0], ['lewis-hamilton', 18], ['jenson-button', 0]]) },
  { round: 18, points: new Map([['sebastian-vettel', 25], ['fernando-alonso', 15], ['mark-webber', 18], ['lewis-hamilton', 12], ['jenson-button', 10]]) },
  { round: 19, points: new Map([['sebastian-vettel', 25], ['fernando-alonso', 6], ['mark-webber', 4], ['lewis-hamilton', 18], ['jenson-button', 15]]) },
];
