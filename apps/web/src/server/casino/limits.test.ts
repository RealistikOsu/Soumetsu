import { beforeEach, describe, expect, mock, test } from 'bun:test';

let counters: Record<string, number> = {};
let locks: Record<string, string> = {};
let expiries: Record<string, number> = {};
mock.module('$server/redis', () => ({
  redis: {
    incr: async (key: string) => (counters[key] = (counters[key] ?? 0) + 1),
    set: async (key: string, value: string | number, ...args: (string | number)[]) => {
      if (key.startsWith('casino:limit:')) {
        const px = args[args.indexOf('PX') + 1] as number;
        if (key in counters) return null;
        counters[key] = Number(value);
        expiries[key] = px;
        return 'OK';
      }
      if (key in locks) return null;
      locks[key] = String(value);
      return 'OK';
    },
    eval: async (_script: string, _n: number, key: string, token: string) => {
      if (locks[key] !== token) return 0;
      delete locks[key];
      return 1;
    }
  }
}));

const { checkLimit, withLock } = await import('./limits');

beforeEach(() => {
  counters = {};
  locks = {};
  expiries = {};
});

describe('checkLimit', () => {
  test('allows 30 calls then throws 429 on the 31st', async () => {
    for (let i = 0; i < 30; i++) await checkLimit('coinflip', 1);
    await expect(checkLimit('coinflip', 1)).rejects.toMatchObject({
      status: 429,
      code: 'casino.too_fast'
    });
  });

  test('sets the window once, before counting', async () => {
    await checkLimit('coinflip', 1);
    expect(expiries['casino:limit:coinflip:1']).toBe(45_000);
    expiries = {};
    await checkLimit('coinflip', 1);
    expect(expiries).toEqual({});
    expect(counters['casino:limit:coinflip:1']).toBe(2);
  });

  test('plinko allows 150', async () => {
    for (let i = 0; i < 150; i++) await checkLimit('plinko', 1);
    await expect(checkLimit('plinko', 1)).rejects.toMatchObject({ status: 429 });
  });

  test('users are counted separately', async () => {
    for (let i = 0; i < 30; i++) await checkLimit('coinflip', 1);
    await checkLimit('coinflip', 2);
  });

  test('an unknown key is a programmer error', async () => {
    await expect(checkLimit('nope', 1)).rejects.toThrow('No casino limit');
  });
});

describe('withLock', () => {
  test('rejects with 409 while the lock is held', async () => {
    locks['casino:lock:1'] = 'other';
    await expect(withLock(1, async () => 'x')).rejects.toMatchObject({
      status: 409,
      code: 'casino.busy'
    });
  });

  test('returns the result and releases the lock', async () => {
    expect(await withLock(1, async () => 'x')).toBe('x');
    expect(locks).toEqual({});
  });

  test('releases the lock when fn throws', async () => {
    await expect(
      withLock(1, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(locks).toEqual({});
  });

  test('does not release a lock another holder took over', async () => {
    await withLock(1, async () => {
      locks['casino:lock:1'] = 'other';
    });
    expect(locks).toEqual({ 'casino:lock:1': 'other' });
  });
});
