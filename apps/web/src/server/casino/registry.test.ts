import { describe, expect, mock, test } from 'bun:test';
import { GAMES } from './games/types';

mock.module('$server/db', () => ({ db: {} }));
mock.module('$server/admin/log', () => ({ rapLog: async () => {} }));

const { instantGames, oddsParsers } = await import('./games/registry');
const { parseOdds } = await import('./config');
const { parseConfigRow } = await import('./admin');
const { instantEntry } = await import('./routes');

const plinkoTable = (n: number, edge: number) => [
  edge,
  ...Array.from({ length: n - 1 }, () => 0.5),
  edge
];
const plinko = (edge: number) => ({
  rows: [8],
  tables: {
    low: { '8': plinkoTable(8, 4) },
    medium: { '8': plinkoTable(8, 9) },
    high: { '8': plinkoTable(8, edge) }
  }
});

const seeded: Record<string, unknown> = {
  coinflip: { multiplier: 1.9 },
  plinko: plinko(500),
  slots: {
    symbols: ['Cherry', 'Lemon', 'Orange', 'Grape', 'Diamond'],
    weights: { Diamond: 1, Grape: 1, Orange: 3, Lemon: 10, Cherry: 30 },
    multipliers: { Diamond: 50, Grape: 12, Orange: 5, Lemon: 2, Cherry: 0.5 },
    columnFactor: 0.5
  },
  zeus: {
    symbols: ['ZEUS', 'LIGHTNING', 'TEMPLE', 'THUNDER', 'COIN', 'EAGLE', 'OWL', 'WILD'],
    weights: {
      ZEUS: 1,
      LIGHTNING: 2,
      TEMPLE: 4,
      THUNDER: 7,
      COIN: 22,
      EAGLE: 16,
      OWL: 14,
      WILD: 1
    },
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
  },
  wheel: {
    segments: [
      ['2x', 2, 'multiplier'],
      ['0.5x', 0.5, 'penalty'],
      ['PENALTY', 0, 'penalty'],
      ['5x', 5, 'multiplier'],
      ['JACKPOT', 50, 'jackpot'],
      ['7x', 7, 'multiplier']
    ],
    weights: { penalty: 5, jackpot: 0.05, ge7: 0.15, ge4: 0.25, ge2: 0.4, else: 1 }
  },
  roulette: {
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
  },
  bingo: { maxCalls: 25, lines: { '1': 1.5, '2': 3, '3': 5, '4': 8, '5': 15 } },
  poker: {
    payouts: {
      royal_flush: 500,
      straight_flush: 35,
      four_of_a_kind: 15,
      full_house: 6,
      flush: 4,
      straight: 3,
      three_of_a_kind: 2,
      two_pair: 1.5,
      jacks_or_better: 0.8
    }
  }
};

describe('oddsParsers', () => {
  test('has a parser for every game', () => {
    for (const game of GAMES) expect(typeof oddsParsers[game]).toBe('function');
  });

  test('every seeded config parses', () => {
    for (const [game, raw] of Object.entries(seeded))
      expect(parseOdds(game as (typeof GAMES)[number], raw)).not.toBeNull();
  });

  test('ported games reject an empty object', () => {
    for (const game of Object.keys(seeded)) expect(parseOdds(game as 'slots', {})).toBeNull();
  });

  test('every instant game has an entry', () => {
    expect(Object.keys(instantGames).sort()).toEqual(
      ['bingo', 'coinflip', 'plinko', 'roulette', 'slots', 'wheel', 'zeus'].sort()
    );
  });
});

describe('instantEntry', () => {
  test('returns the entry for an instant game', () => {
    expect(instantEntry('plinko')).toBe(instantGames.plinko);
  });

  test('404s for poker, unknown names and prototype keys', () => {
    for (const name of ['poker', 'nope', 'constructor', 'mines']) {
      expect(() => instantEntry(name)).toThrow(expect.objectContaining({ status: 404 }));
    }
  });
});

describe('maxPayout through parseConfigRow', () => {
  const row = (odds: unknown) => () =>
    parseConfigRow({ game: 'plinko', minBet: 1, maxBet: 1_000_000, enabled: true, odds });

  test('counts the plinko top multiplier with the supporter factor', () => {
    expect(row(plinko(500))).not.toThrow();
    // 1_000_000 * 2000 * 1.1 overflows a signed int, 1_000_000 * 1900 * 1.1 does not.
    expect(row(plinko(2000))).toThrow();
    expect(row(plinko(1900))).not.toThrow();
  });
});
