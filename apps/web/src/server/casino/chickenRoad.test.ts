import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { sequence } from '../../../test/rng';

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
        if (keys[key] !== from) return 0;
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
const { advance, cashout, pending, start } = await import('./chickenRoad');

const odds = {
  multipliers: [1.02, 1.05, 1.12, 1.25, 1.45, 1.8, 2.3, 3.2, 5.0, 10.0],
  survival: [0.9, 0.82, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.18, 0.1]
};
const KEY = 'casino:chicken_road:1';

function run(step: number, bet = 100) {
  keys[KEY] = JSON.stringify({ bet, step, odds });
}

beforeEach(() => {
  clearConfigCache();
  config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: odds };
  user = { coins: 1000, privileges: 1n };
  updates = [];
  history = [];
  keys = {};
});

test('start takes the bet', async () => {
  const started = await start(1, 100);
  expect(started).toEqual({
    view: { bet: 100, step: 0, multiplier: 1, next: 1.02 },
    balance: 900
  });
  expect(updates).toEqual([[100, 1]]);
  expect(JSON.parse(keys[KEY])).toEqual({ bet: 100, step: 0, odds });
});

describe('advance', () => {
  test('crosses a lane below the survival odds', async () => {
    run(0);
    const played = await advance(1, sequence([0.8999]));
    expect(played).toEqual({ view: { bet: 100, step: 1, multiplier: 1.02, next: 1.05 } });
    expect(played).not.toHaveProperty('view.survival');
    expect(JSON.parse(keys[KEY]).step).toBe(1);
    expect(updates).toEqual([]);
    expect(await pending(1)).toEqual(played.view);
  });

  test('crashes at the survival odds', async () => {
    run(2);
    const played = await advance(1, sequence([0.75]));
    const result = { steps: 2, crashedAt: 3 };
    expect(played).toMatchObject({ result, payout: 0, multiplier: 0, balance: 1000 });
    expect(history).toEqual([
      {
        user_id: 1,
        game_type: 'chicken_road',
        bet_amount: 100,
        multiplier: 0,
        payout: 0,
        result_data: result
      }
    ]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('the last lane cashes out', async () => {
    run(9);
    const played = await advance(1, sequence([0.05]));
    expect(played).toMatchObject({
      result: { steps: 10 },
      payout: 1000,
      multiplier: 10,
      balance: 2000
    });
    expect(played).toHaveProperty('view.next', null);
    expect(keys[KEY]).toBeUndefined();
  });

  test('without a game is a 404', async () => {
    await expect(advance(1, sequence([]))).rejects.toMatchObject({
      status: 404,
      code: 'casino.no_game'
    });
  });
});

describe('cashout', () => {
  test('pays the buffed multiplier of the last lane crossed', async () => {
    user = { coins: 900, privileges: 1n | 4n };
    run(3);
    const played = await cashout(1);
    // 1.12× of 100 is 112, and the supporter buff on the 12 profit makes it 113.
    expect(played).toMatchObject({ result: { steps: 3 }, payout: 113, multiplier: 1.12 });
    expect(history).toMatchObject([{ multiplier: 1.12, payout: 113 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('at the start refunds the bet without the buff', async () => {
    user = { coins: 900, privileges: 1n | 4n };
    run(0);
    const played = await cashout(1);
    expect(played).toMatchObject({ result: { steps: 0 }, payout: 100, multiplier: 1 });
    expect(history).toMatchObject([{ multiplier: 1, payout: 100 }]);
  });
});
