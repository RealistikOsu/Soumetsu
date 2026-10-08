import { Failure } from '$server/respond';
import { crashPoint, multiplierAt } from './games/aviator';
import type { AviatorCurve, AviatorOdds } from './games/aviator';
import { payoutFor } from './games/types';
import { cryptoRng } from './play';
import * as session from './session';
import type { StepOutcome } from './session';

interface Flight {
  bet: number;
  startedAt: number;
  crashPoint: number;
  curve: AviatorCurve;
}

export interface AviatorResult {
  [key: string]: number | boolean | null;
  crashPoint: number;
  cashOutAt: number | null;
  won: boolean;
}

export type AviatorEvent =
  | { type: 'tick'; m: number; startedAt: number }
  | { type: 'crash'; crashPoint: number; balance: number; startedAt: number }
  | { type: 'done' };

// Built field by field so the crash point never reaches a running flight.
export function view({ bet, startedAt, curve }: Flight) {
  return { bet, startedAt, curve };
}

export type AviatorView = ReturnType<typeof view>;

const crashed = (flight: Flight, now: number) =>
  multiplierAt(flight.curve, now - flight.startedAt) >= flight.crashPoint;

const lost = (flight: Flight): StepOutcome<Flight, AviatorView, AviatorResult> => ({
  settle: {
    multiplier: 0,
    base: 0,
    result: { crashPoint: flight.crashPoint, cashOutAt: null, won: false }
  },
  view: view(flight)
});

const read = (userId: number) => session.pending(userId, 'aviator', (flight: Flight) => flight);

const failed = (e: unknown, ...codes: string[]) => e instanceof Failure && codes.includes(e.code);

// Nobody asked for this settle, so it doesn't count against the player's limit.
async function settleCrash(userId: number, now: number) {
  const played = await session.step(
    userId,
    'aviator',
    (flight: Flight) => {
      // A new flight took the old one's place between the read and the lock.
      if (!crashed(flight, now)) throw new Failure(409, 'casino.not_crashed');
      return lost(flight);
    },
    undefined,
    { skipLimit: true }
  );
  if (!('result' in played)) throw new Error('A crash always settles');
  return played;
}

export async function start(
  userId: number,
  rawBet: unknown,
  now: () => number = Date.now,
  rng: () => number = cryptoRng
) {
  const previous = await read(userId);
  if (previous && crashed(previous, now())) {
    try {
      await settleCrash(userId, now());
    } catch (e) {
      // Either way begin sees what's there now.
      if (!failed(e, 'casino.no_game', 'casino.not_crashed')) throw e;
    }
  }

  return session.begin(
    userId,
    'aviator',
    rawBet,
    (odds: AviatorOdds, bet, rng): Flight => ({
      bet,
      startedAt: now(),
      crashPoint: crashPoint(odds, rng),
      curve: odds.curve
    }),
    view,
    rng
  );
}

export async function cashout(userId: number, now = Date.now()) {
  const played = await session.step(
    userId,
    'aviator',
    (flight: Flight): StepOutcome<Flight, AviatorView, AviatorResult> => {
      const m = multiplierAt(flight.curve, now - flight.startedAt);
      if (m >= flight.crashPoint) return lost(flight);
      return {
        settle: {
          multiplier: m,
          base: payoutFor(flight.bet, m),
          result: { crashPoint: flight.crashPoint, cashOutAt: m, won: true }
        },
        view: view(flight)
      };
    }
  );
  if (!('result' in played)) throw new Error('An aviator cash out always settles');
  return played;
}

// null means try again next tick: the lock was busy, so whoever holds it may not settle the crash.
export async function watch(userId: number, now = Date.now()): Promise<AviatorEvent | null> {
  const flight = await read(userId);
  if (!flight) return { type: 'done' };
  const { startedAt } = flight;
  const m = multiplierAt(flight.curve, now - startedAt);
  if (m < flight.crashPoint) return { type: 'tick', m, startedAt };

  try {
    const { result, balance } = await settleCrash(userId, now);
    return { type: 'crash', crashPoint: result.crashPoint, balance, startedAt };
  } catch (e) {
    if (failed(e, 'casino.no_game', 'casino.not_crashed')) return { type: 'done' };
    if (failed(e, 'casino.busy')) return null;
    throw e;
  }
}

export async function pendingFlight(userId: number, now = Date.now()) {
  const flight = await read(userId);
  if (!flight) return null;
  if (!crashed(flight, now)) return view(flight);
  try {
    await settleCrash(userId, now);
    return null;
  } catch (e) {
    if (!failed(e, 'casino.no_game', 'casino.not_crashed', 'casino.busy')) throw e;
  }
  const current = await read(userId);
  return current && !crashed(current, now) ? view(current) : null;
}

const TICK = 100;
// Bun closes connections that stay quiet for 10 seconds, so a comment goes out well within that.
const HEARTBEAT = 5_000;
const MAX_STREAMS = 3;

// Per process, which is enough to stop one player opening streams without end.
const streams = new Map<number, number>();

export function stream(
  userId: number,
  signal: AbortSignal,
  next: () => Promise<AviatorEvent | null> = () => watch(userId),
  tickMs = TICK
) {
  const open = streams.get(userId) ?? 0;
  if (open >= MAX_STREAMS) throw new Failure(429, 'casino.too_fast');
  const encoder = new TextEncoder();
  let stop = () => {};

  return new ReadableStream({
    start(controller) {
      let closed = false;
      let running = false;
      const close = () => {
        try {
          controller.close();
        } catch {
          // Already closed by the reader going away.
        }
      };
      if (signal.aborted) {
        closed = true;
        close();
        return;
      }

      streams.set(userId, open + 1);
      const write = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      const end = () => {
        if (closed) return;
        stop();
        close();
      };

      const tick = async () => {
        // Settling can outlast a tick, and two settles from one stream would only race each other.
        if (running || closed) return;
        running = true;
        try {
          const event = await next();
          if (event) {
            write(`data: ${JSON.stringify(event)}\n\n`);
            if (event.type !== 'tick') end();
          }
        } catch (err) {
          console.error('aviator stream failed', userId, err);
          end();
        } finally {
          running = false;
        }
      };

      const ticker = setInterval(tick, tickMs);
      const heartbeat = setInterval(() => write(': ping\n\n'), HEARTBEAT);
      stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(ticker);
        clearInterval(heartbeat);
        const left = (streams.get(userId) ?? 1) - 1;
        if (left > 0) streams.set(userId, left);
        else streams.delete(userId);
      };
      // Closing too, so a read waiting on the stream finishes.
      signal.addEventListener('abort', end);
      write(': connected\n\n');
      void tick();
    },
    cancel: () => stop()
  });
}
