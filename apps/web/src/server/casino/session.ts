import { Privilege } from '$lib/auth/privileges';
import { db } from '$server/db';
import type { Prisma } from '$server/generated/client';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { donorBuff, gameConfig } from './config';
import type { Game } from './games/types';
import { MAX_MULTIPLIER, toHundredths } from './games/types';
import { recordPlay } from './history';
import { checkLimit, withLock } from './limits';
import { cryptoRng, lockUser, parseBet } from './play';

export interface SessionState {
  bet: number;
}

export interface Settle<R extends Prisma.InputJsonObject> {
  multiplier: number;
  // Unbuffed, straight from payoutFor.
  base: number;
  result: R;
  // A returned stake isn't a win, so the supporter buff doesn't touch it.
  refund?: boolean;
}

export interface Settled<V, R extends Prisma.InputJsonObject> {
  settle: Settle<R>;
  view: V;
}

// `charge` is extra stake taken by this step (a blackjack double). The session adds it to the bet,
// so the game returns its state with the bet it was given.
export type StepOutcome<S extends SessionState, V, R extends Prisma.InputJsonObject> =
  { state: S; view: V; charge?: number } | (Settled<V, R> & { charge?: number });

export type StepResult<V, R> =
  | { view: V; balance?: number }
  | { view: V; result: R; payout: number; multiplier: number; balance: number };

export interface Codes {
  pending: string;
  missing: string;
}

const CODES: Codes = { pending: 'casino.game_pending', missing: 'casino.no_game' };

export interface BeginOptions<O, I> {
  codes?: Codes;
  // Checks the player's input against the odds before the attempt counts towards the limit.
  parse?: (odds: O) => I;
}

// Only replaces the state the caller read, so a write can never land on a game that changed under it.
const SWAP =
  "if redis.call('get', KEYS[1]) == ARGV[1] then redis.call('set', KEYS[1], ARGV[2]) return 1 else return 0 end";

const swap = async (key: string, from: string, to: string) =>
  (await redis.eval(SWAP, 1, key, from, to)) === 1;

const restoreFailed = (key: string, raw: string) => (err: unknown) => {
  console.error('casino session restore failed', key, raw, err);
};

export const stateKey = (game: Game, userId: number) => `casino:${game}:${userId}`;

function assertPublic(privileges: bigint) {
  if ((Number(privileges) & Privilege.Public) === 0) throw new Failure(403, 'site.forbidden');
}

function checkSettle({ base }: Settle<Prisma.InputJsonObject>) {
  if (!Number.isInteger(base) || base < 0) throw new Error(`Bad settle base ${base}`);
}

function amounts({ multiplier, base, refund }: Settle<Prisma.InputJsonObject>, privileges: bigint) {
  const payout = refund ? base : donorBuff(base, Number(privileges));
  // The history column is DECIMAL(6,2).
  const stored = payout > 0 ? Math.min(toHundredths(multiplier), MAX_MULTIPLIER) : 0;
  return { payout, multiplier: stored };
}

export async function begin<O, S extends SessionState, V, R extends Prisma.InputJsonObject, I>(
  userId: number,
  game: Game,
  rawBet: unknown,
  create: (odds: O, bet: number, rng: () => number, input: I) => S | Settled<V, R>,
  view: (state: S) => V,
  rng: () => number = cryptoRng,
  { codes = CODES, parse }: BeginOptions<O, I> = {}
): Promise<StepResult<V, R> & { balance: number }> {
  const cfg = await gameConfig<O>(game);
  if (!cfg.enabled || cfg.odds === null) throw new Failure(403, 'casino.disabled');
  const odds = cfg.odds;
  const bet = parseBet(rawBet, cfg);
  const input = parse ? parse(odds) : (undefined as I);
  await checkLimit(game, userId);
  const key = stateKey(game, userId);

  return withLock(userId, async () => {
    let claimed: string | null = null;
    try {
      return await db.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        assertPublic(user.privileges);

        const created = create(odds, bet, rng, input);
        if ('settle' in created) {
          // Over before it started (a blackjack natural), so nothing is stored, but a running game
          // still blocks a new one.
          checkSettle(created.settle);
          if (await redis.get(key)) throw new Failure(409, codes.pending);
          if (user.coins < bet) throw new Failure(402, 'casino.insufficient_coins');
          const { payout, multiplier } = amounts(created.settle, user.privileges);
          const { result } = created.settle;

          await tx.$executeRaw`UPDATE users SET coins = coins - ${bet} + ${payout} WHERE id = ${userId}`;
          await recordPlay(tx, { userId, game, bet, multiplier, payout, result });
          return {
            view: created.view,
            result,
            payout,
            multiplier,
            balance: user.coins - bet + payout
          };
        }

        // Stored before the deduction so a running game never costs a second bet, and before the
        // coins check so a running game is a 409 rather than a 402.
        const json = JSON.stringify(created);
        if ((await redis.set(key, json, 'NX')) !== 'OK') throw new Failure(409, codes.pending);
        claimed = json;
        if (user.coins < bet) throw new Failure(402, 'casino.insufficient_coins');

        await tx.$executeRaw`UPDATE users SET coins = coins - ${bet} WHERE id = ${userId}`;
        return { view: view(created), balance: user.coins - bet };
      });
    } catch (e) {
      // The bet never went through, so the game mustn't stay playable for free.
      if (claimed !== null) await redis.del(key).catch(restoreFailed(key, claimed));
      throw e;
    }
  });
}

export async function step<S extends SessionState, V, R extends Prisma.InputJsonObject>(
  userId: number,
  game: Game,
  fn: (state: S, rng: () => number) => StepOutcome<S, V, R>,
  rng: () => number = cryptoRng,
  codes: Codes = CODES
): Promise<StepResult<V, R>> {
  // Doesn't read the config, so a game that's paid for always finishes, even once it's disabled
  // or its odds are cleared.
  await checkLimit(game, userId);
  const key = stateKey(game, userId);

  return withLock(userId, async () => {
    const raw = await redis.get(key);
    if (!raw) throw new Failure(404, codes.missing);
    const state = JSON.parse(raw) as S;
    const outcome = fn(state, rng);
    const charge = outcome.charge ?? 0;
    if (!Number.isInteger(charge) || charge < 0) throw new Error(`Bad charge ${charge}`);

    if ('state' in outcome) {
      const next = JSON.stringify({ ...outcome.state, bet: outcome.state.bet + charge });
      if (charge === 0) {
        if (!(await swap(key, raw, next))) throw new Failure(409, 'casino.busy');
        return { view: outcome.view };
      }
      return charged(userId, key, raw, next, charge, outcome.view);
    }

    checkSettle(outcome.settle);
    return settle(userId, game, key, raw, state.bet + charge, charge, outcome, codes);
  });
}

async function charged<V>(
  userId: number,
  key: string,
  raw: string,
  next: string,
  charge: number,
  view: V
) {
  let written = false;
  try {
    return await db.$transaction(async (tx) => {
      const user = await lockUser(tx, userId);
      assertPublic(user.privileges);
      if (user.coins < charge) throw new Failure(402, 'casino.insufficient_coins');

      await tx.$executeRaw`UPDATE users SET coins = coins - ${charge} WHERE id = ${userId}`;
      // Written inside the transaction so the raised stake and the deduction land together. Marked
      // first, since the write can land and still throw.
      written = true;
      if (!(await swap(key, raw, next))) throw new Failure(409, 'casino.busy');
      return { view, balance: user.coins - charge };
    });
  } catch (e) {
    // The extra stake was never taken, so the game goes back to how it was.
    if (written) await swap(key, next, raw).catch(restoreFailed(key, raw));
    throw e;
  }
}

async function settle<V, R extends Prisma.InputJsonObject>(
  userId: number,
  game: Game,
  key: string,
  raw: string,
  bet: number,
  charge: number,
  outcome: Settled<V, R>,
  codes: Codes
) {
  // Taken out of Redis before paying, so a game can only ever be paid once.
  const claimed = await redis.getdel(key);
  if (claimed !== raw) {
    if (claimed) await redis.set(key, claimed, 'NX').catch(restoreFailed(key, claimed));
    throw claimed ? new Failure(409, 'casino.busy') : new Failure(404, codes.missing);
  }

  const { result } = outcome.settle;
  try {
    return await db.$transaction(async (tx) => {
      const user = await lockUser(tx, userId);
      const { payout, multiplier } = amounts(outcome.settle, user.privileges);

      if (charge > 0) {
        assertPublic(user.privileges);
        if (user.coins < charge) throw new Failure(402, 'casino.insufficient_coins');
        await tx.$executeRaw`UPDATE users SET coins = coins - ${charge} + ${payout} WHERE id = ${userId}`;
      } else {
        await tx.$executeRaw`UPDATE users SET coins = coins + ${payout} WHERE id = ${userId}`;
      }
      await recordPlay(tx, { userId, game, bet, multiplier, payout, result });
      return {
        view: outcome.view,
        result,
        payout,
        multiplier,
        balance: user.coins - charge + payout
      };
    });
  } catch (e) {
    // Nothing was paid, so give the game back to be finished again.
    await redis.set(key, raw, 'NX').catch(restoreFailed(key, raw));
    throw e;
  }
}

export async function pending<S extends SessionState, V>(
  userId: number,
  game: Game,
  view: (state: S) => V
): Promise<V | null> {
  const key = stateKey(game, userId);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return view(JSON.parse(raw) as S);
  } catch (err) {
    console.error('casino session state unreadable', key, raw, err);
    return null;
  }
}
