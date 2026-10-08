import { describe, expect, test } from 'bun:test';
import { parseZeusInput, parseZeusOdds, zeus, zeusInfo, zeusMax } from './zeus';
import type { ZeusOdds } from './zeus';

const seeded = {
  symbols: ['ZEUS', 'LIGHTNING', 'TEMPLE', 'THUNDER', 'COIN', 'EAGLE', 'OWL', 'WILD'],
  weights: { ZEUS: 1, LIGHTNING: 2, TEMPLE: 4, THUNDER: 7, COIN: 22, EAGLE: 16, OWL: 14, WILD: 1 },
  multipliers: {
    ZEUS: 200,
    LIGHTNING: 40,
    TEMPLE: 20,
    THUNDER: 10,
    COIN: 2,
    EAGLE: 4,
    OWL: 3,
    WILD: 0
  },
  wildLightningChance: 0.08,
  cols: 5,
  rows: 3
};

const odds = parseZeusOdds(seeded) as ZeusOdds;

function sequence(values: number[]) {
  let i = 0;
  const rng = () => {
    if (i >= values.length) throw new Error('rng drawn too often');
    return values[i++];
  };
  return Object.assign(rng, { used: () => i });
}

// Weights total 67, walked in symbol order: ZEUS (0,1], LIGHTNING (1,3], TEMPLE (3,7],
// THUNDER (7,14], COIN (14,36], EAGLE (36,52], OWL (52,66], WILD (66,67).
// 0.03 -> 2.01 LIGHTNING, 0.3 -> 20.1 COIN, 0.7 -> 46.9 EAGLE, 0.9 -> 60.3 OWL, 0.999 -> 66.93 WILD.
const LIGHTNING = 0.03;
const COIN = 0.3;
const EAGLE = 0.7;
const OWL = 0.9;
const WILD = 0.999;

describe('zeus', () => {
  test('five natural WILDs in the middle pay every symbol at count 5', () => {
    // 15 draws, no LIGHTNING so no extra draws. Each symbol pays m * (5 - 2):
    // 600 + 120 + 60 + 30 + 6 + 12 + 9 = 837.
    const rng = sequence(Array(15).fill(WILD));
    const outcome = zeus(odds, {}, 10, rng);
    expect(rng.used()).toBe(15);
    expect(outcome.result.wildPositions).toEqual([]);
    expect(outcome.result.wins).toEqual([
      { symbol: 'ZEUS', count: 5, multiplier: 600 },
      { symbol: 'LIGHTNING', count: 5, multiplier: 120 },
      { symbol: 'TEMPLE', count: 5, multiplier: 60 },
      { symbol: 'THUNDER', count: 5, multiplier: 30 },
      { symbol: 'COIN', count: 5, multiplier: 6 },
      { symbol: 'EAGLE', count: 5, multiplier: 12 },
      { symbol: 'OWL', count: 5, multiplier: 9 }
    ]);
    expect(outcome.result.totalMultiplier).toBe(837);
    expect(outcome.multiplier).toBe(837);
    expect(outcome.payout).toBe(8370);
  });

  test('LIGHTNING cells draw once more each, column by column, and may turn WILD', () => {
    // grid[col][row]:
    //   col 0: COIN LIGHTNING OWL / col 1: LIGHTNING COIN OWL / col 2: OWL COIN OWL
    //   col 3: OWL EAGLE OWL / col 4: OWL OWL OWL
    // Extra draws in order (0,1) then (1,0): 0.05 < 0.08 turns WILD, 0.5 stays LIGHTNING.
    // Middle row WILD COIN COIN EAGLE OWL: COIN runs 3 -> 2 * 1 = 2, everything else stops early.
    const rng = sequence([
      COIN,
      LIGHTNING,
      OWL,
      LIGHTNING,
      COIN,
      OWL,
      OWL,
      COIN,
      OWL,
      OWL,
      EAGLE,
      OWL,
      OWL,
      OWL,
      OWL,
      0.05,
      0.5
    ]);
    const outcome = zeus(odds, {}, 100, rng);
    expect(rng.used()).toBe(17);
    expect(outcome.result).toEqual({
      grid: [
        ['COIN', 'WILD', 'OWL'],
        ['LIGHTNING', 'COIN', 'OWL'],
        ['OWL', 'COIN', 'OWL'],
        ['OWL', 'EAGLE', 'OWL'],
        ['OWL', 'OWL', 'OWL']
      ],
      wildPositions: [[0, 1]],
      wins: [{ symbol: 'COIN', count: 3, multiplier: 2 }],
      totalMultiplier: 2,
      payout: 200
    });
    expect(outcome.payout).toBe(200);
  });

  test('only the middle row scores', () => {
    // Top and bottom rows all OWL, middle all COIN except col 2 EAGLE: no run of 3.
    const column = (middle: number) => [OWL, middle, OWL];
    const rng = sequence([COIN, COIN, EAGLE, COIN, COIN].flatMap(column));
    const outcome = zeus(odds, {}, 100, rng);
    expect(outcome.result.wins).toEqual([]);
    expect(outcome.multiplier).toBe(0);
    expect(outcome.payout).toBe(0);
  });

  test('a run of four pays the multiplier twice', () => {
    const rng = sequence([EAGLE, EAGLE, EAGLE, EAGLE, COIN].flatMap((m) => [COIN, m, COIN]));
    const outcome = zeus(odds, {}, 100, rng);
    expect(outcome.result.wins).toEqual([{ symbol: 'EAGLE', count: 4, multiplier: 8 }]);
    expect(outcome.payout).toBe(800);
  });

  test('takes no input', () => {
    expect(parseZeusInput()).toEqual({});
  });
});

describe('parseZeusOdds', () => {
  test('accepts the seeded config', () => {
    expect(odds).toEqual(seeded);
  });

  test('rejects bad shapes', () => {
    const noOwlWeight = { ...seeded.weights, OWL: undefined };
    for (const raw of [
      null,
      { ...seeded, symbols: undefined },
      { ...seeded, weights: noOwlWeight },
      { ...seeded, weights: { ...seeded.weights, COIN: -22 } },
      { ...seeded, multipliers: { ...seeded.multipliers, ZEUS: -200 } },
      { ...seeded, wildLightningChance: -0.08 },
      { ...seeded, wildLightningChance: 1.5 },
      { ...seeded, wildLightningChance: undefined },
      { ...seeded, cols: 2 },
      { ...seeded, cols: 5.5 },
      { ...seeded, rows: 1 },
      { ...seeded, rows: '3' },
      { ...seeded, multipliers: { ...seeded.multipliers, ZEUS: 5000 } }
    ])
      expect(parseZeusOdds(raw)).toBeNull();
  });
});

describe('zeusMax and zeusInfo', () => {
  test('the max is a full WILD middle row', () => {
    expect(zeusMax(odds)).toBe(837);
  });

  test('info has no weights or wild chance', () => {
    expect(zeusInfo(odds)).toEqual({ symbols: seeded.symbols, multipliers: seeded.multipliers });
    const json = JSON.stringify(zeusInfo(odds));
    expect(json).not.toContain('weights');
    expect(json).not.toContain('wildLightningChance');
  });
});
