import { describe, expect, test } from 'bun:test';
import { sequence } from '../../../../test/rng';
import { parseWheelOdds, wheel, wheelInfo, wheelMax } from './wheel';
import type { WheelOdds } from './wheel';

const seeded = {
  segments: [
    ['2x', 2, 'multiplier'],
    ['0.5x', 0.5, 'penalty'],
    ['1.5x', 1.5, 'multiplier'],
    ['PENALTY', 0, 'penalty'],
    ['3x', 3, 'multiplier'],
    ['0.2x', 0.2, 'penalty'],
    ['1.2x', 1.2, 'multiplier'],
    ['5x', 5, 'multiplier'],
    ['PENALTY', 0, 'penalty'],
    ['1.8x', 1.8, 'multiplier'],
    ['0.3x', 0.3, 'penalty'],
    ['10x', 10, 'multiplier'],
    ['1x', 1, 'multiplier'],
    ['PENALTY', 0, 'penalty'],
    ['2.5x', 2.5, 'multiplier'],
    ['0.1x', 0.1, 'penalty'],
    ['4x', 4, 'multiplier'],
    ['PENALTY', 0, 'penalty'],
    ['1.5x', 1.5, 'multiplier'],
    ['JACKPOT', 50, 'jackpot'],
    ['2x', 2, 'multiplier'],
    ['PENALTY', 0, 'penalty'],
    ['0.5x', 0.5, 'penalty'],
    ['7x', 7, 'multiplier']
  ],
  weights: { penalty: 5, jackpot: 0.05, ge7: 0.15, ge4: 0.25, ge2: 0.4, else: 1 }
};

const odds = parseWheelOdds(seeded) as WheelOdds;

// Weights: 10 penalties at 5 = 50, the jackpot 0.05, 10x and 7x at 0.15, 5x and 4x at 0.25,
// 2x, 3x, 2.5x and 2x at 0.4, and the five under 2x at 1: 50 + 0.05 + 0.3 + 0.5 + 1.6 + 5 = 57.45.
// Segment 0 (2x) covers (0, 0.4], segment 1 (penalty) the next 5, and 7x the last 0.15.
describe('wheel', () => {
  test('rng 0 lands on the first segment', () => {
    const rng = sequence([0]);
    expect(wheel(odds, {}, 100, rng)).toEqual({
      result: {
        segmentIndex: 0,
        segment: { label: '2x', multiplier: 2, type: 'multiplier' },
        payout: 200
      },
      multiplier: 2,
      payout: 200
    });
    expect(rng.used()).toBe(1);
  });

  test('the boundary between segments 0 and 1', () => {
    // 0.0069 * 57.45 = 0.3964 is inside 2x; 0.0071 * 57.45 = 0.4079 is past it.
    expect(wheel(odds, {}, 100, () => 0.0069).result.segmentIndex).toBe(0);
    const past = wheel(odds, {}, 100, () => 0.0071);
    expect(past.result.segmentIndex).toBe(1);
    expect(past.multiplier).toBe(0.5);
    expect(past.payout).toBe(50);
  });

  test('the top of the range lands on the last segment', () => {
    // 0.9999 * 57.45 = 57.444, past the 57.3 before 7x.
    const outcome = wheel(odds, {}, 10, () => 0.9999);
    expect(outcome.result.segmentIndex).toBe(23);
    expect(outcome.payout).toBe(70);
  });

  test('a penalty segment pays nothing', () => {
    // Segment 3 (PENALTY) covers (6.4, 11.4]; 0.15 * 57.45 = 8.6175.
    const outcome = wheel(odds, {}, 100, () => 0.15);
    expect(outcome.result.segment).toEqual({ label: 'PENALTY', multiplier: 0, type: 'penalty' });
    expect(outcome.payout).toBe(0);
  });
});

describe('parseWheelOdds', () => {
  test('accepts the seeded config', () => {
    expect(odds).toEqual(seeded as WheelOdds);
  });

  test('rejects bad shapes', () => {
    const withSegments = (segments: unknown) => ({ ...seeded, segments });
    for (const raw of [
      null,
      [],
      { weights: seeded.weights },
      withSegments([]),
      withSegments([['2x', 2]]),
      withSegments([['2x', 2, 'bonus']]),
      withSegments([['2x', -2, 'multiplier']]),
      withSegments([['2x', '2', 'multiplier']]),
      withSegments([[2, 2, 'multiplier']]),
      withSegments([['', 2, 'multiplier']]),
      withSegments([['big', 1e5, 'jackpot']]),
      { ...seeded, weights: undefined },
      { ...seeded, weights: { ...seeded.weights, ge7: undefined } },
      { ...seeded, weights: { ...seeded.weights, penalty: -1 } },
      {
        segments: [['PENALTY', 0, 'penalty']],
        weights: { ...seeded.weights, penalty: 0 }
      }
    ])
      expect(parseWheelOdds(raw)).toBeNull();
  });
});

describe('wheelMax and wheelInfo', () => {
  test('the max is the jackpot', () => {
    expect(wheelMax(odds)).toBe(50);
  });

  test('info is the segments and never the weights', () => {
    expect(wheelInfo(odds)).toEqual({ segments: odds.segments });
    expect(JSON.stringify(wheelInfo(odds))).not.toContain('weights');
  });
});
