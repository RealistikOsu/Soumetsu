import { describe, expect, test } from 'bun:test';
import { fakeContext, median } from './context';

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
    expect(ctx.bestTopPp()).toBeNull();
  });
});
