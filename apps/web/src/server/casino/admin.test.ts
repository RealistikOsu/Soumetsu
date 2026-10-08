import { describe, expect, mock, test } from 'bun:test';

mock.module('$server/db', () => ({ db: {} }));
mock.module('$server/admin/log', () => ({ rapLog: async () => {} }));

const { parseConfigRow } = await import('./admin');

const valid = {
  game: 'coinflip' as const,
  minBet: 10,
  maxBet: 500,
  enabled: true,
  odds: { multiplier: 1.9 }
};
const bad = (patch: object) => () => parseConfigRow({ ...valid, ...patch });

describe('parseConfigRow', () => {
  test('accepts a valid row', () => {
    expect(parseConfigRow(valid)).toEqual(valid);
  });

  test('rejects an unknown game or a non-object', () => {
    expect(bad({ game: 'nope' })).toThrow();
    expect(() => parseConfigRow(null)).toThrow();
  });

  test('rejects non-integer and out-of-range bets', () => {
    expect(bad({ minBet: 1.5 })).toThrow();
    expect(bad({ minBet: 0 })).toThrow();
    expect(bad({ minBet: 600 })).toThrow();
    expect(bad({ maxBet: 1_000_001 })).toThrow();
    expect(bad({ enabled: 'yes' })).toThrow();
  });

  test('rejects bad odds', () => {
    expect(bad({ odds: { multiplier: 1 } })).toThrow();
    expect(bad({ odds: null })).toThrow();
  });

  test('rejects a coinflip payout that overflows an int', () => {
    expect(bad({ maxBet: 1_000_000, odds: { multiplier: 3000 } })).toThrow();
    expect(bad({ maxBet: 1_000_000, odds: { multiplier: 2000 } })).toThrow();
    expect(parseConfigRow({ ...valid, maxBet: 1_000_000, odds: { multiplier: 1900 } }).maxBet).toBe(
      1_000_000
    );
  });
});
