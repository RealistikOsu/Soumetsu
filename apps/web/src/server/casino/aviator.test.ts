import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mockCasinoStore } from '../../../test/casino';
import { sequence } from '../../../test/rng';

let config: object | null = null;
let user: { coins: number; privileges: bigint } | null = null;
let updates: unknown[][] = [];
let history: Record<string, unknown>[] = [];
let keys: Record<string, string> = {};
// Runs after the next GET of a flight, to stand in for a request landing in between.
let afterGet: (() => void) | null = null;
let beforeGetdel: () => void = () => {};
let hits = 0;

mockCasinoStore({
  config: () => config,
  user: () => user,
  updates: () => updates,
  history: () => history,
  keys: () => keys,
  incr: () => ++hits,
  onGet: (key) => {
    if (key === KEY && afterGet) {
      const hook = afterGet;
      afterGet = null;
      hook();
    }
  },
  onGetdel: () => beforeGetdel()
});

const { clearConfigCache } = await import('./config');
const { Failure } = await import('$server/respond');
const { cashout, pendingFlight, start, stream, watch } = await import('./aviator');

const curve = { rate: 0.15, power: 1.2 };
const odds = { instantCrash: 0.01, numerator: 100, maxCrash: 1000, curve };
const KEY = 'casino:aviator:1';
const T0 = 1_000_000;
// 1.38× on the seeded curve, under a crash point of 2.
const EARLY = T0 + 3_000;
// 2.06×, past it.
const LATE = T0 + 7_000;

function flight(crash = 2, bet = 100, startedAt = T0) {
  keys[KEY] = JSON.stringify({ bet, startedAt, crashPoint: crash, curve });
}

beforeEach(() => {
  clearConfigCache();
  config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: odds };
  user = { coins: 1000, privileges: 1n };
  updates = [];
  history = [];
  keys = {};
  afterGet = null;
  beforeGetdel = () => {};
  hits = 0;
});

describe('start', () => {
  test('takes the bet and keeps the crash point hidden', async () => {
    const started = await start(1, 100, () => T0, sequence([0.5]));
    expect(started).toEqual({ view: { bet: 100, startedAt: T0, curve }, balance: 900 });
    expect(JSON.stringify(started)).not.toContain('crashPoint');
    expect(updates).toEqual([[100, 1]]);
    expect(JSON.parse(keys[KEY])).toEqual({ bet: 100, startedAt: T0, crashPoint: 2, curve });
  });

  test('settles a crashed flight as a loss first', async () => {
    flight();
    const started = await start(1, 50, () => LATE, sequence([0.5]));
    expect(started).toEqual({ view: { bet: 50, startedAt: LATE, curve }, balance: 950 });
    expect(history).toEqual([
      {
        user_id: 1,
        game_type: 'aviator',
        bet_amount: 100,
        multiplier: 0,
        payout: 0,
        result_data: { crashPoint: 2, cashOutAt: null, won: false }
      }
    ]);
    expect(updates).toEqual([
      [0, 1],
      [50, 1]
    ]);
    expect(JSON.parse(keys[KEY]).bet).toBe(50);
  });

  test('a flight still in the air is a 409', async () => {
    flight();
    await expect(start(1, 50, () => EARLY, sequence([0.5]))).rejects.toMatchObject({
      status: 409,
      code: 'casino.game_pending'
    });
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
  });
});

describe('cashout', () => {
  test('before the crash pays the multiplier at the time', async () => {
    user = { coins: 900, privileges: 1n };
    flight();
    const played = await cashout(1, EARLY);
    const result = { crashPoint: 2, cashOutAt: 1.38, won: true };
    expect(played).toEqual({
      view: { bet: 100, startedAt: T0, curve },
      result,
      payout: 138,
      multiplier: 1.38,
      balance: 1038
    });
    expect(history).toMatchObject([{ bet_amount: 100, multiplier: 1.38, payout: 138 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('applies the supporter buff', async () => {
    user = { coins: 900, privileges: 1n | 4n };
    flight();
    expect(await cashout(1, EARLY)).toMatchObject({ payout: 141, balance: 1041 });
  });

  test('a late cash out loses', async () => {
    user = { coins: 900, privileges: 1n };
    flight();
    const played = await cashout(1, LATE);
    expect(played).toMatchObject({
      result: { crashPoint: 2, cashOutAt: null, won: false },
      payout: 0,
      multiplier: 0,
      balance: 900
    });
    expect(history).toMatchObject([{ multiplier: 0, payout: 0 }]);
  });

  test('right on the crash point loses', async () => {
    flight(1.38);
    expect(await cashout(1, EARLY)).toMatchObject({ payout: 0, result: { won: false } });
  });

  test('an instant crash can never be cashed', async () => {
    flight(1);
    expect(await cashout(1, T0)).toMatchObject({ payout: 0 });
  });

  test('without a flight is a 404', async () => {
    await expect(cashout(1, EARLY)).rejects.toMatchObject({ status: 404, code: 'casino.no_game' });
  });
});

describe('watch', () => {
  test('ticks while in the air', async () => {
    flight();
    expect(await watch(1, EARLY)).toEqual({ type: 'tick', m: 1.38, startedAt: T0 });
    expect(keys[KEY]).toBeDefined();
  });

  test('settles the crash', async () => {
    user = { coins: 900, privileges: 1n };
    flight();
    expect(await watch(1, LATE)).toEqual({
      type: 'crash',
      crashPoint: 2,
      balance: 900,
      startedAt: T0
    });
    expect(history).toMatchObject([{ multiplier: 0, payout: 0 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('is done without a flight', async () => {
    expect(await watch(1, EARLY)).toEqual({ type: 'done' });
  });

  test('is done when a cash out settled it first', async () => {
    flight();
    afterGet = () => {
      delete keys[KEY];
    };
    expect(await watch(1, LATE)).toEqual({ type: 'done' });
    expect(history).toEqual([]);
  });

  test('is done when a new flight took its place', async () => {
    flight();
    afterGet = () => flight(5, 100, LATE);
    expect(await watch(1, LATE)).toEqual({ type: 'done' });
    expect(history).toEqual([]);
    expect(JSON.parse(keys[KEY]).crashPoint).toBe(5);
  });

  test('settles even when the player is over the limit', async () => {
    flight();
    hits = 1000;
    expect(await watch(1, LATE)).toMatchObject({ type: 'crash' });
    expect(history).toHaveLength(1);
  });

  test('skips the tick while the lock is busy', async () => {
    flight();
    keys['casino:lock:1'] = 'someone';
    expect(await watch(1, LATE)).toBeNull();
    expect(history).toEqual([]);
    expect(keys[KEY]).toBeDefined();
  });

  test('skips the tick when the flight changes between the read and the claim', async () => {
    flight();
    const other = JSON.stringify({ bet: 100, startedAt: T0, crashPoint: 1.5, curve });
    beforeGetdel = () => {
      keys[KEY] = other;
    };
    expect(await watch(1, LATE)).toBeNull();
    expect(history).toEqual([]);
    expect(keys[KEY]).toBe(other);
  });

  test('two streams and a cash out settle once', async () => {
    flight();
    const outcomes = await Promise.allSettled([watch(1, LATE), cashout(1, LATE), watch(1, LATE)]);
    expect(history).toHaveLength(1);
    expect(keys[KEY]).toBeUndefined();
    for (const o of outcomes) if (o.status === 'rejected') expect(o.reason).toBeInstanceOf(Failure);
  });
});

describe('pendingFlight', () => {
  test('shows a flight in the air without the crash point', async () => {
    flight();
    const view = await pendingFlight(1, EARLY);
    expect(view).toEqual({ bet: 100, startedAt: T0, curve });
    expect(view).not.toHaveProperty('crashPoint');
  });

  test('settles a crashed flight and shows nothing', async () => {
    flight();
    expect(await pendingFlight(1, LATE)).toBeNull();
    expect(history).toHaveLength(1);
    expect(keys[KEY]).toBeUndefined();
  });

  test('is null without a flight', async () => {
    expect(await pendingFlight(1, EARLY)).toBeNull();
  });
});

describe('stream', () => {
  const read = async (body: ReadableStream<Uint8Array>) => new Response(body).text();
  const forever = async () => ({ type: 'tick' as const, m: 1, startedAt: T0 });

  test('skips ticks with nothing to say', async () => {
    const events = [null, null, { type: 'done' as const }];
    const body = stream(1, new AbortController().signal, async () => events.shift()!, 1);
    expect(await read(body)).toBe(': connected\n\ndata: {"type":"done"}\n\n');
  });

  test('a failing look closes the stream', async () => {
    const logged = spyOn(console, 'error').mockImplementation(() => {});
    const body = stream(
      1,
      new AbortController().signal,
      async () => {
        throw new Error('redis gone');
      },
      1
    );
    expect(await read(body)).toBe(': connected\n\n');
    expect(logged).toHaveBeenCalledTimes(1);
    logged.mockRestore();
  });

  test('a request already gone gets an empty stream and no looks', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const body = stream(
      1,
      controller.signal,
      async () => {
        calls++;
        return { type: 'done' };
      },
      1
    );
    expect(await read(body)).toBe('');
    await Bun.sleep(5);
    expect(calls).toBe(0);
  });

  test('a player gets three streams at once', async () => {
    const controllers = [1, 2, 3].map(() => new AbortController());
    for (const c of controllers) stream(7, c.signal, forever, 1);
    expect(() => stream(7, new AbortController().signal, forever, 1)).toThrow(
      expect.objectContaining({ status: 429, code: 'casino.too_fast' })
    );
    // Another player isn't affected.
    const other = new AbortController();
    stream(8, other.signal, forever, 1);
    other.abort();

    controllers[0].abort();
    const again = new AbortController();
    stream(7, again.signal, forever, 1);
    for (const c of [...controllers, again]) c.abort();
    stream(7, new AbortController().signal, async () => ({ type: 'done' }), 1);
  });

  test('sends ticks, then the crash, and closes', async () => {
    const events = [
      { type: 'tick' as const, m: 1.01, startedAt: T0 },
      { type: 'tick' as const, m: 1.02, startedAt: T0 },
      { type: 'crash' as const, crashPoint: 1.03, balance: 900, startedAt: T0 }
    ];
    const body = stream(1, new AbortController().signal, async () => events.shift()!, 1);
    expect(await read(body)).toBe(
      ': connected\n\n' +
        `data: {"type":"tick","m":1.01,"startedAt":${T0}}\n\n` +
        `data: {"type":"tick","m":1.02,"startedAt":${T0}}\n\n` +
        `data: {"type":"crash","crashPoint":1.03,"balance":900,"startedAt":${T0}}\n\n`
    );
    expect(events).toEqual([]);
  });

  test('closes on done', async () => {
    const body = stream(1, new AbortController().signal, async () => ({ type: 'done' }), 1);
    expect(await read(body)).toBe(': connected\n\ndata: {"type":"done"}\n\n');
  });

  test('never runs two looks at once', async () => {
    let running = 0;
    let most = 0;
    let calls = 0;
    const body = stream(
      1,
      new AbortController().signal,
      async () => {
        running++;
        most = Math.max(most, running);
        await Bun.sleep(15);
        running--;
        return ++calls < 3 ? { type: 'tick', m: 1, startedAt: T0 } : { type: 'done' };
      },
      1
    );
    await read(body);
    expect(most).toBe(1);
    expect(calls).toBe(3);
  });

  test('stops looking once the request is gone', async () => {
    const controller = new AbortController();
    let calls = 0;
    stream(
      1,
      controller.signal,
      async () => {
        calls++;
        return { type: 'tick', m: 1, startedAt: T0 };
      },
      1
    );
    await Bun.sleep(10);
    controller.abort();
    const seen = calls;
    await Bun.sleep(20);
    expect(calls).toBe(seen);
  });

  test('an abort closes the stream, so a waiting read finishes', async () => {
    const controller = new AbortController();
    const body = stream(1, controller.signal, forever, 1_000);
    const text = read(body);
    await Bun.sleep(5);
    controller.abort();
    expect(await text).toBe(`: connected\n\ndata: {"type":"tick","m":1,"startedAt":${T0}}\n\n`);
  });
});
