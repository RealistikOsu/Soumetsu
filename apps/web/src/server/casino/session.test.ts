import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { PokerOdds } from './games/poker';

let config: object | null = null;
let user: { coins: number; privileges: bigint } | null = null;
let updates: unknown[][] = [];
let history: object[] = [];
let keys: Record<string, string> = {};
let locks: Record<string, string> = {};
let waiters: (() => void)[] = [];
let failExecute = false;
let failCommit = false;
let setArgs: (string | number)[][] = [];

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const tx = {
  $queryRaw: async () => (user ? [{ ...user }] : []),
  $executeRaw: async (_sql: TemplateStringsArray, ...values: unknown[]) => {
    if (failExecute) throw new Error('update failed');
    updates.push(values);
    return 1;
  },
  casino_game_history: {
    create: async ({ data }: { data: object }) => {
      history.push(data);
      return data;
    }
  }
};

mock.module('$server/db', () => ({
  db: {
    casino_game_config: { findUnique: async () => config },
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => {
      const result = await fn(tx);
      if (failCommit) throw new Error('commit failed');
      return result;
    }
  }
}));

// Each call yields first, so two unlocked steps would interleave. The lock key blocks rather than
// failing, which turns the real withLock into a queue.
mock.module('$server/redis', () => ({
  redis: {
    incr: async () => 1,
    get: async (key: string) => {
      await tick();
      return keys[key] ?? null;
    },
    getdel: async (key: string) => {
      await tick();
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
      if (key.startsWith('casino:lock:')) {
        while (key in locks) await new Promise<void>((resolve) => waiters.push(resolve));
        locks[key] = value;
        return 'OK';
      }
      if (key.startsWith('casino:limit:')) return 'OK';
      setArgs.push(args);
      await tick();
      if (args.includes('NX') && key in keys) return null;
      if (args.includes('XX') && !(key in keys)) return null;
      keys[key] = value;
      return 'OK';
    },
    eval: async (_script: string, _n: number, key: string, token: string) => {
      if (locks[key] !== token) return 0;
      delete locks[key];
      const woken = waiters;
      waiters = [];
      for (const wake of woken) wake();
      return 1;
    }
  }
}));

const { clearConfigCache } = await import('./config');
const { begin, pending, stateKey, step } = await import('./session');
type StepOutcome = import('./session').StepOutcome<Game, View, { won: boolean }>;

interface Game {
  bet: number;
  n: number;
  top: number;
}
type View = { bet: number; n: number };

const payouts = {
  royal_flush: 500,
  straight_flush: 35,
  four_of_a_kind: 15,
  full_house: 6,
  flush: 4,
  straight: 3,
  three_of_a_kind: 2,
  two_pair: 1.5,
  jacks_or_better: 0.8
};
const KEY = 'casino:poker:1';

const create = (odds: PokerOdds, bet: number): Game => ({
  bet,
  n: 0,
  top: odds.payouts.royal_flush
});
const view = ({ bet, n }: Game): View => ({ bet, n });
const store = (state: Game) => (keys[KEY] = JSON.stringify(state));
const stored = () => JSON.parse(keys[KEY]) as Game;

const advance = (state: Game): StepOutcome => {
  const next = { ...state, n: state.n + 1 };
  return { state: next, view: view(next) };
};

const cashOut =
  (multiplier: number, base: number, extra: Partial<StepOutcome> = {}) =>
  (state: Game): StepOutcome => ({
    settle: { multiplier, base, result: { won: base > 0 } },
    view: view(state),
    ...extra
  });

beforeEach(() => {
  clearConfigCache();
  config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: { payouts } };
  user = { coins: 1000, privileges: 1n };
  updates = [];
  history = [];
  keys = {};
  locks = {};
  waiters = [];
  failExecute = false;
  failCommit = false;
  setArgs = [];
});

test('stateKey keeps the poker key', () => {
  expect(stateKey('poker', 1)).toBe(KEY);
  expect(stateKey('chicken_road', 7)).toBe('casino:chicken_road:7');
});

describe('begin', () => {
  test('takes the bet and stores the state without expiry', async () => {
    const begun = await begin(1, 'poker', 100, create, view);
    expect(begun).toEqual({ view: { bet: 100, n: 0 }, balance: 900 });
    expect(updates).toEqual([[100, 1]]);
    expect(stored()).toEqual({ bet: 100, n: 0, top: 500 });
    expect(setArgs).toEqual([['NX']]);
    expect(history).toEqual([]);
  });

  test('a running game is a 409 and takes nothing', async () => {
    store({ bet: 50, n: 3, top: 500 });
    const before = keys[KEY];
    await expect(begin(1, 'poker', 100, create, view)).rejects.toMatchObject({
      status: 409,
      code: 'casino.game_pending'
    });
    expect(updates).toEqual([]);
    expect(keys[KEY]).toBe(before);
  });

  test('a running game is a 409 even without the coins for another', async () => {
    store({ bet: 50, n: 3, top: 500 });
    user = { coins: 5, privileges: 1n };
    await expect(begin(1, 'poker', 100, create, view)).rejects.toMatchObject({ status: 409 });
  });

  test('passes its own codes', async () => {
    store({ bet: 50, n: 3, top: 500 });
    const codes = { pending: 'casino.hand_pending', missing: 'casino.no_hand' };
    await expect(begin(1, 'poker', 100, create, view, undefined, codes)).rejects.toMatchObject({
      code: 'casino.hand_pending'
    });
  });

  test('not enough coins is a 402 and removes the state', async () => {
    user = { coins: 50, privileges: 1n };
    await expect(begin(1, 'poker', 100, create, view)).rejects.toMatchObject({
      status: 402,
      code: 'casino.insufficient_coins'
    });
    expect(updates).toEqual([]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a failed deduction removes the state', async () => {
    failExecute = true;
    await expect(begin(1, 'poker', 100, create, view)).rejects.toThrow('update failed');
    expect(keys[KEY]).toBeUndefined();
  });

  test('a failed commit removes the state', async () => {
    failCommit = true;
    await expect(begin(1, 'poker', 100, create, view)).rejects.toThrow('commit failed');
    expect(keys[KEY]).toBeUndefined();
  });

  test('a restricted player is a 403 and stores nothing', async () => {
    user = { coins: 1000, privileges: 0n };
    await expect(begin(1, 'poker', 100, create, view)).rejects.toMatchObject({ status: 403 });
    expect(keys[KEY]).toBeUndefined();
    expect(updates).toEqual([]);
  });

  test('a disabled game is a 403', async () => {
    config = { min_bet: 10, max_bet: 1000, enabled: false, config_json: { payouts } };
    await expect(begin(1, 'poker', 100, create, view)).rejects.toMatchObject({
      status: 403,
      code: 'casino.disabled'
    });
  });

  test('a bad bet is a 400', async () => {
    await expect(begin(1, 'poker', 5, create, view)).rejects.toMatchObject({ status: 400 });
  });
});

describe('step', () => {
  test('without a game is a 404', async () => {
    await expect(step(1, 'poker', advance)).rejects.toMatchObject({
      status: 404,
      code: 'casino.no_game'
    });
    await expect(
      step(1, 'poker', advance, undefined, { pending: 'p', missing: 'casino.no_hand' })
    ).rejects.toMatchObject({ code: 'casino.no_hand' });
  });

  test('writes the next state back with XX', async () => {
    store({ bet: 100, n: 0, top: 500 });
    expect(await step(1, 'poker', advance)).toEqual({ view: { bet: 100, n: 1 } });
    expect(stored()).toEqual({ bet: 100, n: 1, top: 500 });
    expect(setArgs).toEqual([['XX']]);
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
  });

  test('a throwing move leaves the state alone', async () => {
    store({ bet: 100, n: 0, top: 500 });
    const before = keys[KEY];
    await expect(
      step(1, 'poker', () => {
        throw new Error('bad move');
      })
    ).rejects.toThrow('bad move');
    expect(keys[KEY]).toBe(before);
  });

  test('a charge deducts and raises the bet', async () => {
    store({ bet: 100, n: 0, top: 500 });
    const played = await step(1, 'poker', (state: Game) => ({ ...advance(state), charge: 100 }));
    expect(played).toEqual({ view: { bet: 100, n: 1 }, balance: 900 });
    expect(updates).toEqual([[100, 1]]);
    expect(stored()).toEqual({ bet: 200, n: 1, top: 500 });
    expect(history).toEqual([]);
  });

  test('a charge without the coins is a 402 and leaves the state', async () => {
    store({ bet: 100, n: 0, top: 500 });
    const before = keys[KEY];
    user = { coins: 50, privileges: 1n };
    await expect(
      step(1, 'poker', (state: Game) => ({ ...advance(state), charge: 100 }))
    ).rejects.toMatchObject({ status: 402, code: 'casino.insufficient_coins' });
    expect(keys[KEY]).toBe(before);
    expect(updates).toEqual([]);
  });

  test('a charge whose commit fails puts the state back', async () => {
    store({ bet: 100, n: 0, top: 500 });
    const before = keys[KEY];
    failCommit = true;
    await expect(
      step(1, 'poker', (state: Game) => ({ ...advance(state), charge: 100 }))
    ).rejects.toThrow('commit failed');
    expect(keys[KEY]).toBe(before);
  });

  test('a settle pays the buffed payout, records the stored bet and clears the game', async () => {
    store({ bet: 100, n: 2, top: 500 });
    user = { coins: 900, privileges: 1n | 4n };
    const played = await step(1, 'poker', cashOut(2.5, 250));
    expect(played).toEqual({
      view: { bet: 100, n: 2 },
      result: { won: true },
      payout: 275,
      multiplier: 2.5,
      balance: 1175
    });
    expect(updates).toEqual([[275, 1]]);
    expect(history).toEqual([
      {
        user_id: 1,
        game_type: 'poker',
        bet_amount: 100,
        multiplier: 2.5,
        payout: 275,
        result_data: { won: true }
      }
    ]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a loss records a zero multiplier', async () => {
    store({ bet: 100, n: 2, top: 500 });
    const played = await step(1, 'poker', cashOut(3, 0));
    expect(played).toMatchObject({ payout: 0, multiplier: 0, balance: 1000 });
    expect(history).toMatchObject([{ multiplier: 0, payout: 0, bet_amount: 100 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a refund skips the supporter buff', async () => {
    store({ bet: 100, n: 0, top: 500 });
    user = { coins: 900, privileges: 1n | 4n };
    const played = await step(1, 'poker', (state: Game) => ({
      settle: { multiplier: 1, base: state.bet, result: { won: false }, refund: true },
      view: view(state)
    }));
    expect(played).toMatchObject({ payout: 100, multiplier: 1, balance: 1000 });
    expect(history).toMatchObject([{ multiplier: 1, payout: 100, bet_amount: 100 }]);
  });

  test('a charge that settles takes and pays in one transaction', async () => {
    store({ bet: 100, n: 1, top: 500 });
    const played = await step(1, 'poker', cashOut(2, 400, { charge: 100 }));
    expect(played).toMatchObject({ payout: 400, multiplier: 2, balance: 1300 });
    expect(updates).toEqual([[100, 400, 1]]);
    expect(history).toMatchObject([{ bet_amount: 200, payout: 400, multiplier: 2 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a charge that settles without the coins is a 402 and keeps the game', async () => {
    store({ bet: 100, n: 1, top: 500 });
    const before = keys[KEY];
    user = { coins: 50, privileges: 1n };
    await expect(step(1, 'poker', cashOut(2, 400, { charge: 100 }))).rejects.toMatchObject({
      status: 402
    });
    expect(keys[KEY]).toBe(before);
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
  });

  test('a failed payout restores the exact state with NX', async () => {
    store({ bet: 100, n: 2, top: 500 });
    const before = keys[KEY];
    failExecute = true;
    await expect(step(1, 'poker', cashOut(2, 200))).rejects.toThrow('update failed');
    expect(keys[KEY]).toBe(before);
    expect(history).toEqual([]);
    expect(setArgs.at(-1)).toEqual(['NX']);
  });

  test('a failed commit restores the exact state', async () => {
    store({ bet: 100, n: 2, top: 500 });
    const before = keys[KEY];
    failCommit = true;
    await expect(step(1, 'poker', cashOut(2, 200))).rejects.toThrow('commit failed');
    expect(keys[KEY]).toBe(before);
  });

  test('concurrent steps run one after the other', async () => {
    store({ bet: 100, n: 0, top: 500 });
    await Promise.all([step(1, 'poker', advance), step(1, 'poker', advance)]);
    expect(stored().n).toBe(2);
  });

  test('concurrent settles pay once', async () => {
    store({ bet: 100, n: 2, top: 500 });
    const results = await Promise.allSettled([
      step(1, 'poker', cashOut(2, 200)),
      step(1, 'poker', cashOut(2, 200))
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { status: 404 }
    });
    expect(updates).toEqual([[200, 1]]);
    expect(history).toHaveLength(1);
  });
});

describe('pending', () => {
  test('is the view of a running game or null', async () => {
    expect(await pending(1, 'poker', view)).toBeNull();
    store({ bet: 100, n: 4, top: 500 });
    expect(await pending(1, 'poker', view)).toEqual({ bet: 100, n: 4 });
  });
});
