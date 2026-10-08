import { beforeEach, describe, expect, mock, test } from 'bun:test';

let config: object | null = null;
let user: { coins: number; privileges: bigint } | null = null;
let updates: unknown[][] = [];
let history: Record<string, unknown>[] = [];
let keys: Record<string, string> = {};

const tx = {
  $queryRaw: async () => (user ? [user] : []),
  $executeRaw: async (_sql: TemplateStringsArray, ...values: unknown[]) => {
    updates.push(values);
    return 1;
  },
  casino_game_history: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      history.push(data);
      return data;
    }
  }
};

mock.module('$server/db', () => ({
  db: {
    casino_game_config: { findUnique: async () => config },
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx)
  }
}));

mock.module('$server/redis', () => ({
  redis: {
    incr: async () => 1,
    get: async (key: string) => keys[key] ?? null,
    getdel: async (key: string) => {
      const value = keys[key] ?? null;
      delete keys[key];
      return value;
    },
    del: async (key: string) => {
      const had = key in keys;
      delete keys[key];
      return had ? 1 : 0;
    },
    set: async (key: string, value: string, ...args: (string | number)[]) => {
      if (args.includes('NX') && key in keys) return null;
      if (args.includes('XX') && !(key in keys)) return null;
      keys[key] = value;
      return 'OK';
    },
    eval: async (_script: string, _n: number, key: string, from: string, to?: string) => {
      if (to === undefined) {
        delete keys[key];
        return 1;
      }
      if (keys[key] !== from) return 0;
      keys[key] = to;
      return 1;
    }
  }
}));

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
  test('pays the buffed multiplier', async () => {
    user = { coins: 900, privileges: 1n | 4n };
    board([0, 1, 2], [10]);
    const played = await cashout(1);
    const result = { mines: [0, 1, 2], revealed: [10], hit: null, cashedOut: true };
    // 0.9× of 100 is 90, and the supporter buff makes it 99.
    expect(played).toMatchObject({ result, payout: 99, multiplier: 0.9, balance: 999 });
    expect(history).toMatchObject([{ multiplier: 0.9, payout: 99, result_data: result }]);
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
