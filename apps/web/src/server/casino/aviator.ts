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
  | { type: 'tick'; m: number }
  | { type: 'crash'; crashPoint: number; balance: number }
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

async function settleCrash(userId: number, now: number) {
  const played = await session.step(userId, 'aviator', (flight: Flight) => {
    // A new flight took the old one's place between the read and the lock.
    if (!crashed(flight, now)) throw new Failure(409, 'casino.busy');
    return lost(flight);
  });
  if (!('result' in played)) throw new Error('A crash always settles');
  return played;
}

// Another request settled the flight first, or will on its next look.
const settledElsewhere = (e: unknown) =>
  e instanceof Failure &&
  (e.status === 429 || e.code === 'casino.busy' || e.code === 'casino.no_game');

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
      if (!(e instanceof Failure && e.code === 'casino.no_game')) throw e;
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

export async function watch(userId: number, now = Date.now()): Promise<AviatorEvent> {
  const flight = await read(userId);
  if (!flight) return { type: 'done' };
  const m = multiplierAt(flight.curve, now - flight.startedAt);
  if (m < flight.crashPoint) return { type: 'tick', m };

  try {
    const { result, balance } = await settleCrash(userId, now);
    return { type: 'crash', crashPoint: result.crashPoint, balance };
  } catch (e) {
    if (settledElsewhere(e)) return { type: 'done' };
    throw e;
  }
}

export async function pendingFlight(userId: number, now = Date.now()) {
  const flight = await read(userId);
  if (!flight) return null;
  if (!crashed(flight, now)) return view(flight);
  try {
    await settleCrash(userId, now);
  } catch (e) {
    if (!settledElsewhere(e)) throw e;
  }
  return null;
}

const TICK = 100;
// Bun closes connections that stay quiet for 10 seconds, so a comment goes out well within that.
const HEARTBEAT = 5_000;

export function stream(
  userId: number,
  signal: AbortSignal,
  next: () => Promise<AviatorEvent> = () => watch(userId),
  tickMs = TICK
) {
  const encoder = new TextEncoder();
  let stop = () => {};

  return new ReadableStream({
    start(controller) {
      let closed = false;
      let running = false;
      const write = (text: string) => {
        if (!closed) controller.enqueue(encoder.encode(text));
      };
      const end = () => {
        if (closed) return;
        stop();
        controller.close();
      };

      const tick = async () => {
        // Settling can outlast a tick, and two settles from one stream would only race each other.
        if (running || closed) return;
        running = true;
        try {
          const event = await next();
          write(`data: ${JSON.stringify(event)}\n\n`);
          if (event.type !== 'tick') end();
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
        closed = true;
        clearInterval(ticker);
        clearInterval(heartbeat);
      };
      signal.addEventListener('abort', stop);
      write(': connected\n\n');
      void tick();
    },
    cancel: () => stop()
  });
}
