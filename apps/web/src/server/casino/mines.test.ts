import { beforeEach, describe, expect, test } from 'bun:test';
import { mockCasinoStore } from '../../../test/casino';

let config: object | null = null;
let user: { coins: number; privileges: bigint } | null = null;
let updates: unknown[][] = [];
let history: Record<string, unknown>[] = [];
let keys: Record<string, string> = {};

mockCasinoStore({
  config: () => config,
  user: () => user,
  updates: () => updates,
  history: () => history,
  keys: () => keys
});

const { clearConfigCache } = await import('./config');
const { cashout, pending, reveal, start } = await import('./mines');

const odds = { grid: 25, edgeBase: 0.75, edgeScale: 0.18, edgePower: 0.45 };
const KEY = 'casino:mines:1';
// 0.99 leaves the tiles in order, so the mines are the first tiles.
const inOrder = () => 0.99;

function board(mines: number[], revealed: number[] = [], bet = 100) {
  keys[KEY] = JSON.stringify({ bet, count: mines.length, mines, revealed, odds });
}

beforeEach(() => {
  clearConfigCache();
  config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: odds };
  user = { coins: 1000, privileges: 1n };
  updates = [];
  history = [];
  keys = {};
});

describe('start', () => {
  test('takes the bet and places the mines', async () => {
    const started = await start(1, { bet: 100, mines: 3 }, inOrder);
    expect(started).toEqual({
      view: { bet: 100, count: 3, revealed: [], multiplier: 1, next: 0.9 },
      balance: 900
    });
    expect(updates).toEqual([[100, 1]]);
    expect(JSON.parse(keys[KEY])).toEqual({
      bet: 100,
      count: 3,
      mines: [0, 1, 2],
      revealed: [],
      odds
    });
  });

  test('a bad mine count is a 400 and takes nothing', async () => {
    for (const mines of [0, 25, 2.5, '3', undefined]) {
      await expect(start(1, { bet: 100, mines })).rejects.toMatchObject({
        status: 400,
        code: 'site.invalid_request'
      });
    }
    expect(updates).toEqual([]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a running game is a 409', async () => {
    board([0]);
    await expect(start(1, { bet: 100, mines: 3 })).rejects.toMatchObject({
      status: 409,
      code: 'casino.game_pending'
    });
    expect(updates).toEqual([]);
  });
});

describe('reveal', () => {
  test('a safe tile raises the multiplier and keeps the mines hidden', async () => {
    board([0, 1, 2]);
    const played = await reveal(1, 10);
    expect(played).toEqual({
      view: { bet: 100, count: 3, revealed: [10], multiplier: 0.9, next: 1.05 }
    });
    expect(JSON.stringify(played)).not.toContain('mines');
    expect(JSON.parse(keys[KEY]).revealed).toEqual([10]);
    expect(updates).toEqual([]);
    expect(history).toEqual([]);

    const resumed = await pending(1);
    expect(resumed).toEqual(played.view);
    expect(resumed).not.toHaveProperty('mines');
  });

  test('a mine loses and shows where they were', async () => {
    board([0, 1, 2], [10]);
    const played = await reveal(1, 1);
    const result = { mines: [0, 1, 2], revealed: [10], hit: 1, cashedOut: false };
    expect(played).toMatchObject({ result, payout: 0, multiplier: 0, balance: 1000 });
    expect(played).toHaveProperty('view.next', null);
    expect(history).toEqual([
      {
        user_id: 1,
        game_type: 'mines',
        bet_amount: 100,
        multiplier: 0,
        payout: 0,
        result_data: result
      }
    ]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('the last safe tile cashes out', async () => {
    board([0], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    const played = await reveal(1, 24);
    expect(played).toMatchObject({
      result: { mines: [0], hit: null, cashedOut: true },
      multiplier: 23.25,
      payout: 2325,
      balance: 3325
    });
    expect(played).toHaveProperty('view.next', null);
    expect(updates).toEqual([[2325, 1]]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a revealed tile again is a 400 and changes nothing', async () => {
    board([0, 1, 2], [10]);
    const stored = keys[KEY];
    await expect(reveal(1, 10)).rejects.toMatchObject({
      status: 400,
      code: 'casino.invalid_move'
    });
    expect(keys[KEY]).toBe(stored);
  });

  test('an off-grid tile is a 400', async () => {
    board([0]);
    for (const tile of [-1, 25, 1.5, '3'])
      await expect(reveal(1, tile)).rejects.toMatchObject({
        status: 400,
        code: 'site.invalid_request'
      });
  });

  test('without a game is a 404', async () => {
    await expect(reveal(1, 3)).rejects.toMatchObject({ status: 404, code: 'casino.no_game' });
  });
});

describe('cashout', () => {
  test('pays a multiplier under 1 without the buff', async () => {
    user = { coins: 900, privileges: 1n | 4n };
    board([0, 1, 2], [10]);
    const played = await cashout(1);
    const result = { mines: [0, 1, 2], revealed: [10], hit: null, cashedOut: true };
    // 0.9× of 100 is 90, which is no profit, so the supporter buff leaves it.
    expect(played).toMatchObject({ result, payout: 90, multiplier: 0.9, balance: 990 });
    expect(history).toMatchObject([{ multiplier: 0.9, payout: 90, result_data: result }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('with nothing revealed refunds the bet without the buff', async () => {
    user = { coins: 900, privileges: 1n | 4n };
    board([0, 1, 2]);
    const played = await cashout(1);
    expect(played).toMatchObject({ payout: 100, multiplier: 1, balance: 1000 });
    expect(history).toMatchObject([{ multiplier: 1, payout: 100 }]);
  });

  test('without a game is a 404', async () => {
    await expect(cashout(1)).rejects.toMatchObject({ status: 404 });
  });
});
