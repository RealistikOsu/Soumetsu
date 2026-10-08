import { beforeEach, describe, expect, mock, test } from 'bun:test';

let row: object | null = null;
let reads = 0;
mock.module('$server/db', () => ({
  db: {
    casino_game_config: {
      findUnique: async () => {
        reads++;
        return row;
      }
    }
  }
}));

const { clearConfigCache, donorBuff, gameConfig, parseOdds, publicConfig } =
  await import('./config');

beforeEach(() => {
  row = null;
  reads = 0;
  clearConfigCache();
});

describe('parseOdds', () => {
  test('accepts a coinflip multiplier above 1', () => {
    expect(parseOdds('coinflip', { multiplier: 1.75 })).toEqual({ multiplier: 1.75 });
  });

  test('rejects a low or missing multiplier', () => {
    expect(parseOdds('coinflip', { multiplier: 0.5 })).toBeNull();
    expect(parseOdds('coinflip', {})).toBeNull();
    expect(parseOdds('coinflip', null)).toBeNull();
  });

  test('passes objects through for other games', () => {
    expect(parseOdds('slots', { a: 1 })).toEqual({ a: 1 });
    expect(parseOdds('slots', 5)).toBeNull();
  });
});

describe('donorBuff', () => {
  test('adds 10% for donors, rounded down', () => {
    expect(donorBuff(100, 4)).toBe(110);
    expect(donorBuff(101, 4)).toBe(111);
  });

  test('leaves others and zero alone', () => {
    expect(donorBuff(100, 1)).toBe(100);
    expect(donorBuff(0, 4)).toBe(0);
  });
});

describe('gameConfig', () => {
  test('a missing row disables the game', async () => {
    const config = await gameConfig('coinflip');
    expect(config.enabled).toBe(false);
    expect(config.odds).toBeNull();
  });

  test('reads the row and caches it', async () => {
    row = { min_bet: 10, max_bet: 500, enabled: true, config_json: { multiplier: 1.9 } };
    const config = await gameConfig('coinflip');
    expect(config).toEqual({
      game: 'coinflip',
      minBet: 10,
      maxBet: 500,
      enabled: true,
      odds: { multiplier: 1.9 }
    });
    await gameConfig('coinflip');
    expect(reads).toBe(1);
    clearConfigCache();
    await gameConfig('coinflip');
    expect(reads).toBe(2);
  });

  test('publicConfig has no odds', async () => {
    row = { min_bet: 10, max_bet: 500, enabled: true, config_json: { multiplier: 1.9 } };
    const list = await publicConfig();
    expect(list).toHaveLength(12);
    for (const entry of list) expect('odds' in entry).toBe(false);
  });
});
