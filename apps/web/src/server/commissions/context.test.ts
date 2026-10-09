import { describe, expect, mock, test } from 'bun:test';
import type { DayScore } from './scores';

mock.module('$server/db', () => ({
  db: {
    users: { findUnique: async () => null },
    users_stats: { findUnique: async () => null },
    $queryRaw: async () => []
  }
}));
const { fakeContext, loadContext, median } = await import('./context');

describe('median', () => {
  test('middle of an odd list', () => expect(median([5, 1, 3])).toBe(3));
  test('mean of the middle pair', () => expect(median([1, 2, 3, 4])).toBe(2.5));
  test('null when empty', () => expect(median([])).toBeNull());
});

describe('fakeContext', () => {
  test('has empty loaders by default', async () => {
    const ctx = fakeContext({});
    expect(await ctx.scores()).toEqual([]);
    expect(ctx.topPp(0, 0)).toBe(0);
    expect(ctx.ppBasis).toBeNull();
  });
});

describe('leaderboardRanks', () => {
  test('a play whose row is gone is never placed', async () => {
    const ctx = await loadContext(1, fakeContext({}).window);
    const plays = [
      { id: 5, source: 'stable', variant: 1 },
      { id: 6, source: 'lazer', variant: 0 }
    ] as DayScore[];
    expect(await ctx.leaderboardRanks(plays)).toEqual([
      { rank: Infinity, previousFirst: null, previousFirstValue: null },
      { rank: Infinity, previousFirst: null, previousFirstValue: null }
    ]);
  });
});
