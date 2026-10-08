import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Card } from './games/poker';

let config: object | null = null;
let user: { coins: number; privileges: bigint } | null = null;
let updates: unknown[][] = [];
let history: object[] = [];
let keys: Record<string, string> = {};
let failSet = false;
let failExecute = false;
let failCommit = false;
let setArgs: (string | number)[][] = [];

const tx = {
  $queryRaw: async () => (user ? [user] : []),
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
      if (key.startsWith('casino:poker:')) setArgs.push(args);
      if (failSet && key.startsWith('casino:poker:')) throw new Error('redis down');
      if (args.includes('NX') && key in keys) return null;
      keys[key] = value;
      return 'OK';
    },
    eval: async (_script: string, _n: number, key: string) => {
      delete keys[key];
      return 1;
    }
  }
}));

const { clearConfigCache } = await import('./config');
const { deal, draw, pending } = await import('./poker');

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
// 0.99 leaves the deck in order: the hand is A-5 of spades.
const inOrder = () => 0.99;

beforeEach(() => {
  clearConfigCache();
  config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: { payouts } };
  user = { coins: 1000, privileges: 1n };
  updates = [];
  history = [];
  keys = {};
  failSet = false;
  failExecute = false;
  failCommit = false;
  setArgs = [];
});

describe('deal', () => {
  test('takes the bet and stores the hand', async () => {
    const dealt = await deal(1, 100, inOrder);
    expect(dealt.bet).toBe(100);
    expect(dealt.balance).toBe(900);
    expect(dealt.hand).toEqual([1, 2, 3, 4, 5].map((rank) => ({ suit: 'S', rank })));
    expect(updates).toEqual([[100, 1]]);
    const stored = JSON.parse(keys[KEY]);
    expect(stored.bet).toBe(100);
    expect(stored.hand).toEqual(dealt.hand);
    expect(stored.deck).toHaveLength(47);
    expect(stored.payouts).toEqual({ ...payouts, nothing: 0 });
    // No expiry, so a hand that's paid for is never forfeited.
    expect(setArgs).toEqual([['NX']]);
    expect(history).toEqual([]);
    expect(await pending(1)).toEqual({ hand: dealt.hand, bet: 100 });
  });

  test('a second deal is a 409 and takes nothing', async () => {
    await deal(1, 100);
    updates = [];
    await expect(deal(1, 100)).rejects.toMatchObject({
      status: 409,
      code: 'casino.hand_pending'
    });
    expect(updates).toEqual([]);
  });

  test('a Redis failure takes nothing', async () => {
    failSet = true;
    await expect(deal(1, 100)).rejects.toThrow('redis down');
    expect(updates).toEqual([]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a failed deduction leaves no hand behind', async () => {
    failExecute = true;
    await expect(deal(1, 100)).rejects.toThrow('update failed');
    expect(keys[KEY]).toBeUndefined();
    expect(history).toEqual([]);
  });

  test('a failed commit leaves no hand behind', async () => {
    failCommit = true;
    await expect(deal(1, 100)).rejects.toThrow('commit failed');
    expect(keys[KEY]).toBeUndefined();
    expect(history).toEqual([]);
  });

  test('a pending hand is a 409 even without the coins for another', async () => {
    await deal(1, 100);
    user = { coins: 50, privileges: 1n };
    await expect(deal(1, 100)).rejects.toMatchObject({ status: 409 });
  });

  test('not enough coins is a 402', async () => {
    user = { coins: 50, privileges: 1n };
    await expect(deal(1, 100)).rejects.toMatchObject({ status: 402 });
    expect(updates).toEqual([]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a disabled game is a 403', async () => {
    config = { min_bet: 10, max_bet: 1000, enabled: false, config_json: { payouts } };
    await expect(deal(1, 100)).rejects.toMatchObject({ status: 403, code: 'casino.disabled' });
  });
});

describe('draw', () => {
  test('without a hand is a 404 and writes nothing', async () => {
    await expect(draw(1, [false, false, false, false, false])).rejects.toMatchObject({
      status: 404,
      code: 'casino.no_hand'
    });
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
  });

  test('pays the buffed payout, records the raw result and clears the hand', async () => {
    user = { coins: 1000, privileges: 1n | 4n };
    keys[KEY] = JSON.stringify({
      hand: [
        { suit: 'S', rank: 1 },
        { suit: 'H', rank: 1 },
        { suit: 'D', rank: 2 },
        { suit: 'C', rank: 5 },
        { suit: 'S', rank: 9 }
      ],
      deck: [
        { suit: 'S', rank: 13 },
        { suit: 'H', rank: 13 },
        { suit: 'D', rank: 13 }
      ],
      bet: 100,
      payouts: { ...payouts, nothing: 0 }
    });
    const hand: Card[] = [
      { suit: 'S', rank: 1 },
      { suit: 'H', rank: 1 },
      { suit: 'S', rank: 13 },
      { suit: 'H', rank: 13 },
      { suit: 'D', rank: 13 }
    ];
    const played = await draw(1, [true, true, false, false, false], inOrder);
    // Full house pays 6x: 600, and the supporter buff on the 500 profit makes it 650.
    const result = { hand, handRank: 'full_house' as const, multiplier: 6, payout: 600 };
    expect(played).toEqual({ result, payout: 650, multiplier: 6, balance: 1650 });
    expect(updates).toEqual([[650, 1]]);
    expect(history).toEqual([
      {
        user_id: 1,
        game_type: 'poker',
        bet_amount: 100,
        multiplier: 6,
        payout: 650,
        result_data: result
      }
    ]);
    expect(keys[KEY]).toBeUndefined();
    expect(await pending(1)).toBeNull();
  });

  test('a losing hand records a zero multiplier', async () => {
    keys[KEY] = JSON.stringify({
      hand: [
        { suit: 'S', rank: 2 },
        { suit: 'H', rank: 5 },
        { suit: 'D', rank: 9 },
        { suit: 'C', rank: 11 },
        { suit: 'S', rank: 13 }
      ],
      deck: [],
      bet: 100,
      payouts: { ...payouts, nothing: 0 }
    });
    user = { coins: 900, privileges: 1n | 4n };
    const played = await draw(1, [true, true, true, true, true], inOrder);
    expect(played.result.handRank).toBe('nothing');
    expect(played).toMatchObject({ payout: 0, multiplier: 0, balance: 900 });
    expect(history).toMatchObject([{ multiplier: 0, payout: 0 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a disabled game still finishes a pending hand', async () => {
    await deal(1, 100, inOrder);
    clearConfigCache();
    config = { min_bet: 10, max_bet: 1000, enabled: false, config_json: { payouts } };
    updates = [];
    await draw(1, [true, true, true, true, true]);
    expect(keys[KEY]).toBeUndefined();
    expect(updates).toHaveLength(1);
    expect(history).toMatchObject([{ bet_amount: 100 }]);
  });

  test('pays from the stored payouts once the odds are cleared', async () => {
    await deal(1, 100, inOrder);
    clearConfigCache();
    config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: null };
    updates = [];
    // A-5 of spades held is a straight flush: 35x.
    const played = await draw(1, [true, true, true, true, true]);
    expect(played).toMatchObject({ payout: 3500, multiplier: 35, balance: 4500 });
    expect(keys[KEY]).toBeUndefined();
  });

  test('a failed payout puts the hand back as it was', async () => {
    await deal(1, 100, inOrder);
    const stored = keys[KEY];
    failExecute = true;
    await expect(draw(1, [true, true, true, true, true])).rejects.toThrow('update failed');
    expect(keys[KEY]).toBe(stored);
    expect(history).toEqual([]);
    expect(setArgs.at(-1)).toEqual(['NX']);
  });

  test('a failed commit puts the hand back as it was', async () => {
    await deal(1, 100, inOrder);
    const stored = keys[KEY];
    failCommit = true;
    await expect(draw(1, [true, true, true, true, true])).rejects.toThrow('commit failed');
    expect(keys[KEY]).toBe(stored);
  });

  test('bad holds are a 400', async () => {
    await expect(draw(1, [true])).rejects.toMatchObject({ status: 400 });
  });
});
