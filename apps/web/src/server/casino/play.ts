import { randomBytes } from 'node:crypto';
import { Privilege } from '$lib/auth/privileges';
import { db } from '$server/db';
import type { Prisma } from '$server/generated/client';
import { Failure } from '$server/respond';
import { donorBuff, gameConfig } from './config';
import type { Game } from './config';
import { recordPlay } from './history';
import { checkLimit, withLock } from './limits';

export interface PlayOutcome<R> {
  result: R;
  multiplier: number;
  payout: number;
}

export type GameRunner<O, I, R extends Prisma.InputJsonObject> = (
  odds: O,
  input: I,
  bet: number,
  rng: () => number
) => PlayOutcome<R>;

export const cryptoRng = () => randomBytes(4).readUInt32BE(0) / 2 ** 32;

export function parseBet(raw: unknown, cfg: { minBet: number; maxBet: number }) {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < cfg.minBet || raw > cfg.maxBet)
    throw new Failure(400, 'casino.invalid_bet');
  return raw;
}

export async function play<O, I, R extends Prisma.InputJsonObject>(
  userId: number,
  game: Game,
  rawBet: unknown,
  input: I,
  run: GameRunner<O, I, R>
): Promise<{ result: R; payout: number; multiplier: number; balance: number }> {
  const cfg = await gameConfig<O>(game);
  if (!cfg.enabled || cfg.odds === null) throw new Failure(403, 'casino.disabled');
  const odds = cfg.odds;
  const bet = parseBet(rawBet, cfg);
  await checkLimit(game, userId);

  return withLock(userId, () =>
    db.$transaction(async (tx) => {
      const [user] = await tx.$queryRaw<{ coins: number; privileges: bigint }[]>`
        SELECT coins, privileges FROM users WHERE id = ${userId} FOR UPDATE`;
      if (!user) throw new Failure(404, 'users.user_not_found');
      const privileges = Number(user.privileges);
      if ((privileges & Privilege.Public) === 0) throw new Failure(403, 'site.forbidden');
      if (user.coins < bet) throw new Failure(402, 'casino.insufficient_coins');

      const outcome = run(odds, input, bet, cryptoRng);
      const payout = donorBuff(outcome.payout, privileges);
      const multiplier = outcome.payout > 0 ? outcome.multiplier : 0;

      await tx.$executeRaw`UPDATE users SET coins = coins - ${bet} + ${payout} WHERE id = ${userId}`;
      await recordPlay(tx, { userId, game, bet, multiplier, payout, result: outcome.result });

      return { result: outcome.result, payout, multiplier, balance: user.coins - bet + payout };
    })
  );
}
