import { describe, expect, test } from 'bun:test';
import { sequence } from '../../../../test/rng';
import { chickenInfo, chickenMax, crossLane, parseChickenOdds } from './chickenRoad';
import type { ChickenOdds } from './chickenRoad';

const seeded = {
  multipliers: [1.02, 1.05, 1.12, 1.25, 1.45, 1.8, 2.3, 3.2, 5.0, 10.0],
  survival: [0.9, 0.82, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.18, 0.1]
};
const odds = parseChickenOdds(seeded) as ChickenOdds;

describe('parseChickenOdds', () => {
  test('accepts the seeded odds', () => {
    expect(odds).toEqual(seeded);
  });

  test('rejects bad shapes', () => {
    for (const raw of [
      null,
      [],
      {},
      { multipliers: [], survival: [] },
      { multipliers: [1.5, 2], survival: [0.5] },
      { multipliers: [1, 2], survival: [0.5, 0.5] },
      { multipliers: [2, 1.5], survival: [0.5, 0.5] },
      { multipliers: [1.5, 1.5], survival: [0.5, 0.5] },
      { multipliers: [1.5, 10000], survival: [0.5, 0.5] },
      { multipliers: [1.5, 2], survival: [0, 0.5] },
      { multipliers: [1.5, 2], survival: [0.5, 1.1] },
      { multipliers: ['1.5', 2], survival: [0.5, 0.5] }
    ])
      expect(parseChickenOdds(raw)).toBeNull();
  });

  test('max and info', () => {
    expect(chickenMax(odds)).toBe(10);
    expect(chickenInfo(odds)).toEqual({ multipliers: seeded.multipliers });
    expect(chickenInfo(odds)).not.toHaveProperty('survival');
  });
});

describe('crossLane', () => {
  test('survives strictly below the odds', () => {
    expect(crossLane(odds, 0, sequence([0.8999]))).toBe(true);
    expect(crossLane(odds, 0, sequence([0.9]))).toBe(false);
    expect(crossLane(odds, 9, sequence([0.0999]))).toBe(true);
    expect(crossLane(odds, 9, sequence([0.1]))).toBe(false);
  });

  test('draws once', () => {
    const rng = sequence([0.5]);
    crossLane(odds, 3, rng);
    expect(rng.used()).toBe(1);
  });
});
