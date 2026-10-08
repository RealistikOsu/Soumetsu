import { beforeEach, describe, expect, mock, test } from 'bun:test';

let row: object | null = null;
let reads = 0;
mock.module('$server/db', () => ({
  db: {
    casino_game_config: {
      findUnique: async ({ where }: { where: { game_type: string } }) => {
        reads++;
        return where.game_type === 'coinflip' ? row : null;
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

  test('rejects a low, huge or missing multiplier', () => {
    expect(parseOdds('coinflip', { multiplier: 0.5 })).toBeNull();
    expect(parseOdds('coinflip', { multiplier: 10000 })).toBeNull();
    expect(parseOdds('coinflip', { multiplier: 1.004 })).toBeNull();
    expect(parseOdds('coinflip', { multiplier: 9999.996 })).toBeNull();
    expect(parseOdds('coinflip', {})).toBeNull();
    expect(parseOdds('coinflip', null)).toBeNull();
  });

  test('passes objects through for games that are not ported yet', () => {
    expect(parseOdds('mines', { a: 1 })).toEqual({ a: 1 });
    expect(parseOdds('mines', [1])).toBeNull();
    expect(parseOdds('mines', 5)).toBeNull();
    expect(parseOdds('slots', { a: 1 })).toBeNull();
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
    expect(config).toEqual({
      game: 'coinflip',
      minBet: 1,
      maxBet: 5000,
      enabled: false,
      odds: null
    });
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
    for (const entry of list)
      expect(Object.keys(entry).sort()).toEqual(['enabled', 'game', 'maxBet', 'minBet']);
  });

  test('publicConfig shows a row with bad odds as off', async () => {
    row = { min_bet: 10, max_bet: 500, enabled: true, config_json: { multiplier: 0.5 } };
    const coinflip = (await publicConfig()).find((g) => g.game === 'coinflip');
    expect(coinflip?.enabled).toBe(false);
  });
});
