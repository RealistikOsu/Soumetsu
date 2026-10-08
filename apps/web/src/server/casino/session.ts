import { Privilege } from '$lib/auth/privileges';
import { db } from '$server/db';
import type { Prisma } from '$server/generated/client';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { donorBuff, gameConfig } from './config';
import type { Game } from './games/types';
import { toHundredths } from './games/types';
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

// `charge` is extra stake taken by this step (a blackjack double). The session adds it to the bet,
// so the game returns its state with the bet it was given.
export type StepOutcome<S extends SessionState, V, R extends Prisma.InputJsonObject> =
  { state: S; view: V; charge?: number } | { settle: Settle<R>; view: V; charge?: number };

export type StepResult<V, R> =
  | { view: V; balance?: number }
  | { view: V; result: R; payout: number; multiplier: number; balance: number };

export interface Codes {
  pending: string;
  missing: string;
}

const CODES: Codes = { pending: 'casino.game_pending', missing: 'casino.no_game' };

export const stateKey = (game: Game, userId: number) => `casino:${game}:${userId}`;

function assertPublic(privileges: bigint) {
  if ((Number(privileges) & Privilege.Public) === 0) throw new Failure(403, 'site.forbidden');
}

export async function begin<O, S extends SessionState, V>(
  userId: number,
  game: Game,
  rawBet: unknown,
  create: (odds: O, bet: number, rng: () => number) => S,
  view: (state: S) => V,
  rng: () => number = cryptoRng,
  codes: Codes = CODES
): Promise<{ view: V; balance: number }> {
  const cfg = await gameConfig<O>(game);
  if (!cfg.enabled || cfg.odds === null) throw new Failure(403, 'casino.disabled');
  const odds = cfg.odds;
  const bet = parseBet(rawBet, cfg);
  await checkLimit(game, userId);
  const key = stateKey(game, userId);

  return withLock(userId, async () => {
    let claimed = false;
    try {
      return await db.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        assertPublic(user.privileges);

        const state = create(odds, bet, rng);
        // Stored before the deduction so a running game never costs a second bet, and before the
        // coins check so a running game is a 409 rather than a 402.
        const stored = await redis.set(key, JSON.stringify(state), 'NX');
        if (stored !== 'OK') throw new Failure(409, codes.pending);
        claimed = true;
        if (user.coins < bet) throw new Failure(402, 'casino.insufficient_coins');

        await tx.$executeRaw`UPDATE users SET coins = coins - ${bet} WHERE id = ${userId}`;
        return { view: view(state), balance: user.coins - bet };
      });
    } catch (e) {
      // The bet never went through, so the game mustn't stay playable for free.
      if (claimed) await redis.del(key).catch(() => {});
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
  // Plays on with the odds stored at the start, so a game that's paid for always finishes, even
  // once it's disabled or its odds are cleared.
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
      const next = { ...outcome.state, bet: outcome.state.bet + charge };
      if (charge === 0) {
        if ((await redis.set(key, JSON.stringify(next), 'XX')) !== 'OK')
          throw new Failure(404, codes.missing);
        return { view: outcome.view };
      }
      return charged(userId, key, raw, next, charge, outcome.view, codes);
    }

    return settle(userId, game, key, raw, state.bet + charge, charge, outcome, codes);
  });
}

async function charged<V>(
  userId: number,
  key: string,
  raw: string,
  next: SessionState,
  charge: number,
  view: V,
  codes: Codes
) {
  let written = false;
  try {
    return await db.$transaction(async (tx) => {
      const user = await lockUser(tx, userId);
      assertPublic(user.privileges);
      if (user.coins < charge) throw new Failure(402, 'casino.insufficient_coins');

      await tx.$executeRaw`UPDATE users SET coins = coins - ${charge} WHERE id = ${userId}`;
      // Written inside the transaction so the raised stake and the deduction land together.
      if ((await redis.set(key, JSON.stringify(next), 'XX')) !== 'OK')
        throw new Failure(404, codes.missing);
      written = true;
      return { view, balance: user.coins - charge };
    });
  } catch (e) {
    // The extra stake was never taken, so the game goes back to how it was.
    if (written) await redis.set(key, raw, 'XX').catch(() => {});
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
  outcome: { settle: Settle<R>; view: V },
  codes: Codes
) {
  // Taken out of Redis before paying, so a game can only ever be paid once.
  const claimed = await redis.getdel(key);
  if (claimed !== raw) {
    if (claimed) await redis.set(key, claimed, 'NX').catch(() => {});
    throw claimed ? new Failure(409, 'casino.busy') : new Failure(404, codes.missing);
  }

  const { multiplier, base, result, refund } = outcome.settle;
  try {
    return await db.$transaction(async (tx) => {
      const user = await lockUser(tx, userId);
      const payout = refund ? base : donorBuff(base, Number(user.privileges));
      const stored = payout > 0 ? toHundredths(multiplier) : 0;

      if (charge > 0) {
        assertPublic(user.privileges);
        if (user.coins < charge) throw new Failure(402, 'casino.insufficient_coins');
        await tx.$executeRaw`UPDATE users SET coins = coins - ${charge} + ${payout} WHERE id = ${userId}`;
      } else {
        await tx.$executeRaw`UPDATE users SET coins = coins + ${payout} WHERE id = ${userId}`;
      }
      await recordPlay(tx, { userId, game, bet, multiplier: stored, payout, result });
      return {
        view: outcome.view,
        result,
        payout,
        multiplier: stored,
        balance: user.coins - charge + payout
      };
    });
  } catch (e) {
    // Nothing was paid, so give the game back to be finished again.
    await redis.set(key, raw, 'NX').catch(() => {});
    throw e;
  }
}

export async function pending<S extends SessionState, V>(
  userId: number,
  game: Game,
  view: (state: S) => V
): Promise<V | null> {
  const raw = await redis.get(stateKey(game, userId));
  return raw ? view(JSON.parse(raw) as S) : null;
}
