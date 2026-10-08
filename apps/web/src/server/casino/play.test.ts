import { beforeEach, describe, expect, mock, test } from 'bun:test';

let config: object | null = null;
let user: { coins: number; privileges: bigint } | null = null;
let updates: unknown[][] = [];
let history: object[] = [];

const tx = {
  $queryRaw: async () => (user ? [user] : []),
  $executeRaw: async (_sql: TemplateStringsArray, ...values: unknown[]) => {
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
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx)
  }
}));

const keys: Record<string, string> = {};
mock.module('$server/redis', () => ({
  redis: {
    incr: async () => 1,
    pexpire: async () => 1,
    set: async (key: string, value: string) => {
      if (key in keys) return null;
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
const { parseBet, play } = await import('./play');
const { coinflip } = await import('./games/coinflip');

const cfg = { minBet: 10, maxBet: 1000 };

describe('parseBet', () => {
  test('accepts integers inside the limits', () => {
    expect(parseBet(10, cfg)).toBe(10);
    expect(parseBet(500, cfg)).toBe(500);
    expect(parseBet(1000, cfg)).toBe(1000);
  });

  test('rejects anything else', () => {
    for (const raw of [10.5, '100', NaN, Infinity, null, 9, 1001])
      expect(() => parseBet(raw, cfg)).toThrow(
        expect.objectContaining({ status: 400, code: 'casino.invalid_bet' })
      );
  });
});

describe('play', () => {
  beforeEach(() => {
    clearConfigCache();
    config = {
      min_bet: 10,
      max_bet: 1000,
      enabled: true,
      config_json: { multiplier: 1.75 }
    };
    user = { coins: 1000, privileges: 1n | 4n };
    updates = [];
    history = [];
  });

  // Heads wins unless the crypto roll lands tails, so retry until a flip comes up heads.
  async function win() {
    for (;;) {
      const played = await play(1, 'coinflip', 100, { choice: 'heads' as const }, coinflip);
      if (played.result.won) return played;
      updates = [];
      history = [];
    }
  }

  test('a supporter win pays the buffed payout and records the raw result', async () => {
    const played = await win();
    expect(played).toEqual({
      result: { outcome: 'heads', choice: 'heads', won: true },
      payout: 192,
      multiplier: 1.75,
      balance: 1092
    });
    expect(updates).toEqual([[100, 192, 1]]);
    expect(history).toEqual([
      {
        user_id: 1,
        game_type: 'coinflip',
        bet_amount: 100,
        multiplier: 1.75,
        payout: 192,
        result_data: { outcome: 'heads', choice: 'heads', won: true }
      }
    ]);
  });

  test('a loss records a zero multiplier', async () => {
    const played = await play(1, 'coinflip', 100, { choice: 'heads' as const }, () => ({
      result: { lost: true },
      multiplier: 1.75,
      payout: 0
    }));
    expect(played).toEqual({ result: { lost: true }, payout: 0, multiplier: 0, balance: 900 });
    expect(updates).toEqual([[100, 0, 1]]);
    expect(history).toMatchObject([{ multiplier: 0, payout: 0 }]);
  });

  test('not enough coins is a 402 and writes nothing', async () => {
    user = { coins: 50, privileges: 1n };
    await expect(play(1, 'coinflip', 100, { choice: 'heads' }, coinflip)).rejects.toMatchObject({
      status: 402,
      code: 'casino.insufficient_coins'
    });
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
  });

  test('a restricted player is refused', async () => {
    user = { coins: 1000, privileges: 0n };
    await expect(play(1, 'coinflip', 100, { choice: 'heads' }, coinflip)).rejects.toMatchObject({
      status: 403,
      code: 'site.forbidden'
    });
    expect(updates).toEqual([]);
  });

  test('a disabled game is a 403 and writes nothing', async () => {
    config = { min_bet: 10, max_bet: 1000, enabled: false, config_json: { multiplier: 1.75 } };
    await expect(play(1, 'coinflip', 100, { choice: 'heads' }, coinflip)).rejects.toMatchObject({
      status: 403,
      code: 'casino.disabled'
    });
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
  });

  test('a game with bad odds is treated as disabled', async () => {
    config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: { multiplier: 0.5 } };
    await expect(play(1, 'coinflip', 100, { choice: 'heads' }, coinflip)).rejects.toMatchObject({
      status: 403,
      code: 'casino.disabled'
    });
  });

  test('an out of range bet is rejected before the transaction', async () => {
    await expect(play(1, 'coinflip', 5000, { choice: 'heads' }, coinflip)).rejects.toMatchObject({
      status: 400,
      code: 'casino.invalid_bet'
    });
    expect(updates).toEqual([]);
  });
});
