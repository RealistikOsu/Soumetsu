import { describe, expect, test } from 'bun:test';
import { sequence } from '../../../../test/rng';
import {
  BET_TYPES,
  parseRouletteInput,
  parseRouletteOdds,
  roulette,
  rouletteInfo,
  rouletteMax
} from './roulette';
import type { BetType, RouletteOdds } from './roulette';

const seeded = {
  slots: 38,
  red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
  payouts: {
    straight: 36,
    red: 2,
    black: 2,
    even: 2,
    odd: 2,
    low: 2,
    high: 2,
    dozen1: 3,
    dozen2: 3,
    dozen3: 3,
    col1: 3,
    col2: 3,
    col3: 3
  }
};

const odds = parseRouletteOdds(seeded) as RouletteOdds;

// floor(rng * 38) picks the pocket, so (n + 0.5) / 38 lands on n.
const pocket = (n: number) => sequence([(n + 0.5) / 38]);

const spin = (n: number, betType: BetType, betNumber: number | null = null) =>
  roulette(odds, { betType, betNumber }, 100, pocket(n));

const invalid = expect.objectContaining({ status: 400, code: 'site.invalid_request' });

describe('roulette', () => {
  test('a straight on 0 wins 36x on 0', () => {
    const rng = pocket(0);
    expect(roulette(odds, { betType: 'straight', betNumber: 0 }, 100, rng)).toEqual({
      result: {
        number: 0,
        pocket: '0',
        color: 'green',
        betType: 'straight',
        betNumber: 0,
        won: true,
        multiplier: 36,
        payout: 3600
      },
      multiplier: 36,
      payout: 3600
    });
    expect(rng.used()).toBe(1);
  });

  test('00 shows as 0 and loses every bet, even a straight on 0', () => {
    for (const betType of BET_TYPES) {
      const outcome = spin(37, betType, betType === 'straight' ? 0 : null);
      expect(outcome.result.number).toBe(0);
      expect(outcome.result.pocket).toBe('00');
      expect(outcome.result.color).toBe('green');
      expect(outcome.result.won).toBe(false);
      expect(outcome.multiplier).toBe(0);
      expect(outcome.payout).toBe(0);
    }
  });

  test('the top of the rng range is 00', () => {
    expect(roulette(odds, { betType: 'odd', betNumber: null }, 100, () => 0.99999).result).toEqual(
      expect.objectContaining({ number: 0, pocket: '00', won: false })
    );
  });

  // [bet, winning pocket, losing pocket]
  const cases: [BetType, number, number][] = [
    ['red', 1, 2],
    ['black', 2, 1],
    ['even', 2, 0],
    ['odd', 35, 0],
    ['low', 18, 19],
    ['high', 19, 18],
    ['dozen1', 12, 13],
    ['dozen2', 13, 25],
    ['dozen3', 36, 24],
    ['col1', 34, 0],
    ['col2', 35, 36],
    ['col3', 36, 0]
  ];

  for (const [betType, win, lose] of cases)
    test(`${betType} wins on ${win} and loses on ${lose}`, () => {
      const won = spin(win, betType);
      expect(won.result.won).toBe(true);
      expect(won.multiplier).toBe(seeded.payouts[betType]);
      expect(won.payout).toBe(100 * seeded.payouts[betType]);
      const lost = spin(lose, betType);
      expect(lost.result.won).toBe(false);
      expect(lost.multiplier).toBe(0);
      expect(lost.payout).toBe(0);
    });

  test('a straight loses on any other number', () => {
    const outcome = spin(8, 'straight', 7);
    expect(outcome.result).toEqual({
      number: 8,
      pocket: '8',
      color: 'black',
      betType: 'straight',
      betNumber: 7,
      won: false,
      multiplier: 0,
      payout: 0
    });
  });
});

describe('parseRouletteInput', () => {
  test('a straight keeps its number', () => {
    expect(parseRouletteInput({ betType: 'straight', betNumber: 7 })).toEqual({
      betType: 'straight',
      betNumber: 7
    });
    expect(parseRouletteInput({ betType: 'straight', betNumber: 0 })).toEqual({
      betType: 'straight',
      betNumber: 0
    });
  });

  test('other bets store no number', () => {
    expect(parseRouletteInput({ betType: 'red', betNumber: 7 })).toEqual({
      betType: 'red',
      betNumber: null
    });
    expect(parseRouletteInput({ betType: 'col2' })).toEqual({ betType: 'col2', betNumber: null });
  });

  test('rejects anything else', () => {
    for (const raw of [
      null,
      {},
      { betType: 'green' },
      { betType: 'straight' },
      { betType: 'straight', betNumber: 7.5 },
      { betType: 'straight', betNumber: 40 },
      { betType: 'straight', betNumber: -1 },
      { betType: 'straight', betNumber: 37 },
      { betType: 'straight', betNumber: '7' }
    ])
      expect(() => parseRouletteInput(raw)).toThrow(invalid);
  });
});

describe('parseRouletteOdds', () => {
  test('accepts the seeded config', () => {
    expect(odds).toEqual(seeded);
  });

  test('rejects bad shapes', () => {
    for (const raw of [
      null,
      [],
      { ...seeded, slots: 37 },
      { ...seeded, slots: '38' },
      { ...seeded, red: undefined },
      { ...seeded, red: [0, ...seeded.red.slice(1)] },
      { ...seeded, red: seeded.red.slice(1) },
      { ...seeded, red: [3, ...seeded.red.slice(1)] },
      { ...seeded, red: [37, ...seeded.red.slice(1)] },
      { ...seeded, red: [1.5, ...seeded.red.slice(1)] },
      { ...seeded, payouts: undefined },
      { ...seeded, payouts: { ...seeded.payouts, col3: undefined } },
      { ...seeded, payouts: { ...seeded.payouts, red: -2 } },
      { ...seeded, payouts: { ...seeded.payouts, straight: 1e5 } }
    ])
      expect(parseRouletteOdds(raw)).toBeNull();
  });
});

describe('rouletteMax and rouletteInfo', () => {
  test('the max is the straight payout', () => {
    expect(rouletteMax(odds)).toBe(36);
  });

  test('info is the red numbers and payouts', () => {
    expect(rouletteInfo(odds)).toEqual({ red: seeded.red, payouts: seeded.payouts });
  });
});
