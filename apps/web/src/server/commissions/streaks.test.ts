import { describe, expect, test } from 'bun:test';
import { dayOrdinal, streakStats, streaks, weekIndex } from './streaks';

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('streaks', () => {
  test('counts a run that includes today', () => {
    expect(streaks(new Set([10, 11, 12]), 12)).toEqual({ current: 3, best: 3 });
  });
  test('keeps the current run alive if it ended yesterday', () => {
    expect(streaks(new Set([10, 11]), 12)).toEqual({ current: 2, best: 2 });
  });
  test('drops the current run after a gap', () => {
    expect(streaks(new Set([5, 6, 10]), 12)).toEqual({ current: 0, best: 2 });
  });
  test('is empty with no periods', () => {
    expect(streaks(new Set(), 12)).toEqual({ current: 0, best: 0 });
  });
});

describe('dayOrdinal and weekIndex', () => {
  test('matches Python for a known date', () => {
    expect(dayOrdinal(utc('2026-10-08'))).toBe(739897);
    expect(weekIndex(utc('2026-10-08'))).toBe(Math.floor((739897 - 1) / 7));
  });
});

describe('streakStats', () => {
  test('a week counts with three completed days', () => {
    const days = [
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07'
    ].map(utc);
    const stats = streakStats(days, utc('2026-10-08'));
    expect(stats.totalDays).toBe(6);
    expect(stats.currentDailyStreak).toBe(3);
    expect(stats.bestDailyStreak).toBe(3);
    expect(stats.currentWeeklyStreak).toBe(2);
    expect(stats.bestWeeklyStreak).toBe(2);
  });
  test('two days in a week do not count', () => {
    const stats = streakStats(['2026-10-06', '2026-10-07'].map(utc), utc('2026-10-08'));
    expect(stats.currentWeeklyStreak).toBe(0);
  });
});
