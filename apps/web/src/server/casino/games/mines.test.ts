import { describe, expect, test } from 'bun:test';
import { sequence } from '../../../../test/rng';
import {
  minesInfo,
  minesMax,
  minesMultiplier,
  parseMineCount,
  parseMinesOdds,
  parseTile,
  placeMines
} from './mines';
import type { MinesOdds } from './mines';

const seeded = { grid: 25, edgeBase: 0.75, edgeScale: 0.18, edgePower: 0.45 };
const odds = parseMinesOdds(seeded) as MinesOdds;

describe('parseMinesOdds', () => {
  test('accepts the seeded odds', () => {
    expect(odds).toEqual(seeded);
  });

  test('rejects bad shapes', () => {
    for (const raw of [
      null,
      [],
      {},
      { ...seeded, grid: 1 },
      { ...seeded, grid: 25.5 },
      { ...seeded, grid: '25' },
      { ...seeded, edgeBase: 0 },
      { ...seeded, edgeScale: -0.1 },
      { ...seeded, edgePower: 0 },
      { ...seeded, edgeBase: 0.9, edgeScale: 0.2 },
      { ...seeded, edgeBase: Infinity }
    ])
      expect(parseMinesOdds(raw)).toBeNull();
  });

  test('max and info', () => {
    expect(minesMax()).toBe(9999.99);
    expect(minesInfo(odds)).toEqual({ grid: 25 });
  });
});

describe('minesMultiplier', () => {
  test('matches the casino', () => {
    expect(minesMultiplier(odds, 3, 0)).toBe(1);
    // (0.75 + 0.18 × (1/22)^0.45) ÷ (22/25)
    expect(minesMultiplier(odds, 3, 1)).toBe(0.9);
    expect(minesMultiplier(odds, 5, 1)).toBe(1);
    expect(minesMultiplier(odds, 24, 1)).toBe(23.25);
    expect(minesMultiplier(odds, 1, 24)).toBe(23.25);
    expect(minesMultiplier(odds, 3, 22)).toBe(2139);
  });

  test('is capped', () => {
    expect(minesMultiplier(odds, 20, 5)).toBe(9999.99);
  });

  test('uses the grid from the odds', () => {
    // 1 mine in 4, 3 revealed: probability 1/4, full edge 0.93.
    expect(minesMultiplier({ ...odds, grid: 4 }, 1, 3)).toBe(3.72);
  });
});

describe('placeMines', () => {
  test('takes the first tiles of the shuffle', () => {
    expect(placeMines(25, 3, () => 0.99)).toEqual([0, 1, 2]);
    // i = 3: j = 0, i = 2: j = 2, i = 1: j = 1 on [0, 1, 2, 3].
    const rng = sequence([0, 0.99, 0.99]);
    expect(placeMines(4, 2, rng)).toEqual([3, 1]);
    expect(rng.used()).toBe(3);
  });
});

describe('input', () => {
  test('mine count is 1 to grid − 1', () => {
    expect(parseMineCount(1, 25)).toBe(1);
    expect(parseMineCount(24, 25)).toBe(24);
    for (const raw of [0, 25, 2.5, '3', null, undefined])
      expect(() => parseMineCount(raw, 25)).toThrow(
        expect.objectContaining({ status: 400, code: 'site.invalid_request' })
      );
  });

  test('tile is on the grid', () => {
    expect(parseTile(0, 25)).toBe(0);
    expect(parseTile(24, 25)).toBe(24);
    for (const raw of [-1, 25, 1.5, '1', null])
      expect(() => parseTile(raw, 25)).toThrow(
        expect.objectContaining({ status: 400, code: 'site.invalid_request' })
      );
  });
});
