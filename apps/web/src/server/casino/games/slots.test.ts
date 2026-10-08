import { describe, expect, test } from 'bun:test';
import { sequence } from '../../../../test/rng';
import { parseSlotsInput, parseSlotsOdds, slots, slotsInfo, slotsMax } from './slots';
import type { SlotsOdds } from './slots';

const seeded = {
  symbols: ['Cherry', 'Lemon', 'Orange', 'Grape', 'Diamond'],
  weights: { Diamond: 1, Grape: 1, Orange: 3, Lemon: 10, Cherry: 30 },
  multipliers: { Diamond: 50, Grape: 12, Orange: 5, Lemon: 2, Cherry: 0.5 },
  columnFactor: 0.5
};

const odds = parseSlotsOdds(seeded) as SlotsOdds;

// Weights total 45, walked in symbol order: Cherry (0,30], Lemon (30,40], Orange (40,43],
// Grape (43,44], Diamond (44,45). So 0.1 -> 4.5 Cherry, 0.8 -> 36 Lemon, 0.92 -> 41.4 Orange,
// 0.97 -> 43.65 Grape, 0.999 -> 44.955 Diamond.
const C = 0.1;
const L = 0.8;
const O = 0.92;
const G = 0.97;
const D = 0.999;

describe('slots', () => {
  test('all Diamonds pay three columns and all five lines', () => {
    // Columns: floor(50 * 0.5 * 100) / 100 = 25 each; lines 50 each. 3 * 25 + 5 * 50 = 325.
    const rng = sequence(Array(9).fill(D));
    const outcome = slots(odds, {}, 100, rng);
    expect(rng.used()).toBe(9);
    expect(outcome.result.grid).toEqual(Array(3).fill(Array(3).fill('Diamond')));
    expect(outcome.result.paylines).toEqual([
      { line: 'column_0', symbol: 'Diamond', multiplier: 25 },
      { line: 'column_1', symbol: 'Diamond', multiplier: 25 },
      { line: 'column_2', symbol: 'Diamond', multiplier: 25 },
      { line: 'top', symbol: 'Diamond', multiplier: 50 },
      { line: 'middle', symbol: 'Diamond', multiplier: 50 },
      { line: 'bottom', symbol: 'Diamond', multiplier: 50 },
      { line: 'diagonal_down', symbol: 'Diamond', multiplier: 50 },
      { line: 'diagonal_up', symbol: 'Diamond', multiplier: 50 }
    ]);
    expect(outcome.result.totalMultiplier).toBe(325);
    expect(outcome.multiplier).toBe(325);
    expect(outcome.payout).toBe(32500);
    expect(outcome.result.payout).toBe(32500);
  });

  test('all Cherries pay the five lines but no columns', () => {
    const outcome = slots(odds, {}, 100, () => C);
    expect(outcome.result.paylines.map((p) => p.line)).toEqual([
      'top',
      'middle',
      'bottom',
      'diagonal_down',
      'diagonal_up'
    ]);
    expect(outcome.multiplier).toBe(2.5);
    expect(outcome.payout).toBe(250);
  });

  test('a mixed grid with only the down diagonal', () => {
    // grid[col][row], drawn column by column:
    //   col 0: Orange Cherry Lemon / col 1: Lemon Orange Cherry / col 2: Cherry Lemon Orange
    // Only [0][0], [1][1], [2][2] match: diagonal_down Orange, 5.
    const rng = sequence([O, C, L, L, O, C, C, L, O]);
    const outcome = slots(odds, {}, 100, rng);
    expect(outcome.result).toEqual({
      grid: [
        ['Orange', 'Cherry', 'Lemon'],
        ['Lemon', 'Orange', 'Cherry'],
        ['Cherry', 'Lemon', 'Orange']
      ],
      paylines: [{ line: 'diagonal_down', symbol: 'Orange', multiplier: 5 }],
      totalMultiplier: 5,
      payout: 500
    });
    expect(outcome.payout).toBe(500);
  });

  test('the up diagonal reads bottom-left to top-right', () => {
    // col 0: Lemon Cherry Grape / col 1: Cherry Grape Lemon / col 2: Grape Lemon Cherry
    const outcome = slots(odds, {}, 10, sequence([L, C, G, C, G, L, G, L, C]));
    expect(outcome.result.paylines).toEqual([
      { line: 'diagonal_up', symbol: 'Grape', multiplier: 12 }
    ]);
    expect(outcome.payout).toBe(120);
  });

  test('a column line floors the factored multiplier to hundredths', () => {
    // Lemon column at factor 0.333: floor(2 * 0.333 * 100) / 100 = 0.66.
    const custom = { ...odds, columnFactor: 0.333 };
    const outcome = slots(custom, {}, 100, sequence([L, L, L, C, O, C, O, C, O]));
    expect(outcome.result.paylines).toEqual([
      { line: 'column_0', symbol: 'Lemon', multiplier: 0.66 }
    ]);
    expect(outcome.payout).toBe(66);
  });

  test('no line pays nothing', () => {
    const outcome = slots(odds, {}, 100, sequence([O, C, L, L, O, C, C, L, G]));
    expect(outcome.result.paylines).toEqual([]);
    expect(outcome.multiplier).toBe(0);
    expect(outcome.payout).toBe(0);
  });

  test('takes no input', () => {
    expect(parseSlotsInput()).toEqual({});
  });
});

describe('parseSlotsOdds', () => {
  test('accepts the seeded config', () => {
    expect(odds).toEqual(seeded);
  });

  test('rejects bad shapes', () => {
    const noCherryWeight = { ...seeded.weights, Cherry: undefined };
    for (const raw of [
      null,
      { ...seeded, symbols: [] },
      { ...seeded, symbols: ['Cherry', 'Cherry'] },
      { ...seeded, weights: noCherryWeight },
      { ...seeded, weights: { ...seeded.weights, Lemon: -1 } },
      { ...seeded, weights: { Diamond: 0, Grape: 0, Orange: 0, Lemon: 0, Cherry: 0 } },
      { ...seeded, multipliers: { ...seeded.multipliers, Grape: -12 } },
      { ...seeded, multipliers: { ...seeded.multipliers, Grape: '12' } },
      { ...seeded, multipliers: { Diamond: 50 } },
      { ...seeded, columnFactor: -0.5 },
      { ...seeded, columnFactor: undefined },
      { ...seeded, multipliers: { ...seeded.multipliers, Diamond: 5000 } }
    ])
      expect(parseSlotsOdds(raw)).toBeNull();
  });
});

describe('slotsMax and slotsInfo', () => {
  test('the max is every line and column on the top symbol', () => {
    expect(slotsMax(odds)).toBe(325);
  });

  test('info has no weights', () => {
    expect(slotsInfo(odds)).toEqual({
      symbols: seeded.symbols,
      multipliers: seeded.multipliers,
      columnFactor: 0.5,
      columns: { Cherry: null, Lemon: 1, Orange: 2.5, Grape: 6, Diamond: 25 }
    });
    expect(JSON.stringify(slotsInfo(odds))).not.toContain('weights');
  });
});
