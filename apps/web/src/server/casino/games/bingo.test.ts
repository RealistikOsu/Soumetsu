import { describe, expect, test } from 'bun:test';
import { bingo, bingoInfo, bingoMax, parseBingoOdds } from './bingo';
import type { BingoOdds } from './bingo';

const seeded = { maxCalls: 25, lines: { '1': 1.5, '2': 3, '3': 5, '4': 8, '5': 15 } };

const odds = parseBingoOdds(seeded) as BingoOdds;

function sequence(values: number[]) {
  let i = 0;
  const rng = () => {
    if (i >= values.length) throw new Error('rng drawn too often');
    return values[i++];
  };
  return Object.assign(rng, { used: () => i });
}

const range = (start: number, length: number) => Array.from({ length }, (_, i) => start + i);

// Fisher-Yates with j = floor(rng * (i + 1)) swaps a[i] with a[0] at every step when rng is 0,
// which rotates the list left by one: [1..15] becomes [2..15, 1]. A card takes 14 draws per
// column (70 in all) and the balls 74, so all zeros gives this card, grid[col][row]:
const zeroCard = [
  [2, 3, 4, 5, 6],
  [17, 18, 19, 20, 21],
  [32, 33, null, 35, 36],
  [47, 48, 49, 50, 51],
  [62, 63, 64, 65, 66]
];
const CARD_DRAWS = Array(70).fill(0);

// The draws that make the shuffle of `pool` come out as `target`: at each i, pick the index
// where target[i] currently sits.
function drawsFor(pool: number[], target: number[]) {
  const a = [...pool];
  const draws: number[] = [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = a.indexOf(target[i]);
    [a[i], a[j]] = [a[j], a[i]];
    draws.push((j + 0.5) / (i + 1));
  }
  return draws;
}

function ballDraws(first: number[]) {
  const balls = range(1, 75);
  return drawsFor(balls, [...first, ...balls.filter((b) => !first.includes(b))]);
}

describe('bingo', () => {
  test('all zeros: the card rotates, and the fifth call completes the first column', () => {
    // Balls come out 2, 3, 4, ..., 75, 1. Calls 2..6 fill grid[0], which the casino names row0.
    const rng = sequence(Array(144).fill(0));
    const outcome = bingo(odds, {}, 100, rng);
    expect(rng.used()).toBe(144);
    expect(outcome.result.grid).toEqual(zeroCard);
    expect(outcome.result.called).toEqual([2, 3, 4, 5, 6]);
    expect(outcome.result.markedGrid).toEqual([
      [true, true, true, true, true],
      [false, false, false, false, false],
      [false, false, true, false, false],
      [false, false, false, false, false],
      [false, false, false, false, false]
    ]);
    expect(outcome.result.won).toBe(true);
    expect(outcome.result.wonLines).toEqual(['row0']);
    expect(outcome.multiplier).toBe(1.5);
    expect(outcome.payout).toBe(150);
    expect(outcome.result.payout).toBe(150);
  });

  test('no line within maxCalls pays nothing', () => {
    const outcome = bingo({ ...odds, maxCalls: 4 }, {}, 100, () => 0);
    expect(outcome.result.called).toEqual([2, 3, 4, 5]);
    expect(outcome.result.won).toBe(false);
    expect(outcome.result.wonLines).toEqual([]);
    expect(outcome.multiplier).toBe(0);
    expect(outcome.payout).toBe(0);
  });

  test('calls stop at maxCalls', () => {
    // 25 balls that are not on the zero card come out first.
    const onCard = zeroCard.flat();
    const misses = range(1, 75)
      .filter((b) => !onCard.includes(b))
      .slice(0, 25);
    const rng = sequence([...CARD_DRAWS, ...ballDraws(misses)]);
    const outcome = bingo(odds, {}, 100, rng);
    expect(outcome.result.called).toEqual(misses);
    expect(outcome.result.called.length).toBe(25);
    expect(outcome.result.won).toBe(false);
    expect(outcome.payout).toBe(0);
  });

  test('one ball finishing two lines pays the two-line multiplier', () => {
    // 3..6 fill grid[0] but its top cell, 17, 32, 47, 62 fill row 0 but grid[0][0].
    // Ball 2 then completes both row0 and col0.
    const first = [3, 4, 5, 6, 17, 32, 47, 62, 2];
    const rng = sequence([...CARD_DRAWS, ...ballDraws(first)]);
    const outcome = bingo(odds, {}, 100, rng);
    expect(rng.used()).toBe(144);
    expect(outcome.result.grid).toEqual(zeroCard);
    expect(outcome.result.called).toEqual(first);
    expect(outcome.result.wonLines).toEqual(['row0', 'col0']);
    expect(outcome.multiplier).toBe(3);
    expect(outcome.payout).toBe(300);
  });

  test('the FREE centre counts toward its lines', () => {
    // grid[2] is 32, 33, FREE, 35, 36.
    const first = [32, 33, 35, 36];
    const outcome = bingo(odds, {}, 10, sequence([...CARD_DRAWS, ...ballDraws(first)]));
    expect(outcome.result.called).toEqual(first);
    expect(outcome.result.wonLines).toEqual(['row2']);
    expect(outcome.payout).toBe(15);
  });
});

describe('parseBingoOdds', () => {
  test('accepts the seeded config', () => {
    expect(odds).toEqual(seeded);
  });

  test('rejects bad shapes', () => {
    for (const raw of [
      null,
      [],
      { lines: seeded.lines },
      { ...seeded, maxCalls: 0 },
      { ...seeded, maxCalls: 76 },
      { ...seeded, maxCalls: 2.5 },
      { ...seeded, maxCalls: '25' },
      { ...seeded, lines: undefined },
      { ...seeded, lines: { ...seeded.lines, '5': undefined } },
      { ...seeded, lines: { ...seeded.lines, '2': -3 } },
      { ...seeded, lines: { ...seeded.lines, '5': 1e5 } }
    ])
      expect(parseBingoOdds(raw)).toBeNull();
  });
});

describe('bingoMax and bingoInfo', () => {
  test('the max is the five-line multiplier', () => {
    expect(bingoMax(odds)).toBe(15);
  });

  test('info is the line multipliers', () => {
    expect(bingoInfo(odds)).toEqual({ lines: seeded.lines });
  });
});
