import { Privilege } from '$lib/auth/privileges';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { donorBuff, gameConfig } from './config';
import { dealHand, drawHand, parseHeld, parsePokerOdds } from './games/poker';
import type { Card } from './games/poker';
import { payoutFor } from './games/types';
import { recordPlay } from './history';
import { checkLimit, withLock } from './limits';
import { cryptoRng, parseBet } from './play';

interface Pending {
  hand: Card[];
  deck: Card[];
  bet: number;
}

// A dealt hand that's never drawn is forfeited when this runs out.
const HAND_TTL = 86400;

const handKey = (userId: number) => `casino:poker:${userId}`;

async function load(userId: number): Promise<Pending | null> {
  const raw = await redis.get(handKey(userId));
  return raw ? (JSON.parse(raw) as Pending) : null;
}

export async function deal(userId: number, rawBet: unknown, rng: () => number = cryptoRng) {
  const cfg = await gameConfig('poker');
  if (!cfg.enabled || !parsePokerOdds(cfg.odds)) throw new Failure(403, 'casino.disabled');
  const bet = parseBet(rawBet, cfg);
  await checkLimit('poker', userId);
  const key = handKey(userId);

  return withLock(userId, async () => {
    let claimed = false;
    try {
      return await db.$transaction(async (tx) => {
        const [user] = await tx.$queryRaw<{ coins: number; privileges: bigint }[]>`
          SELECT coins, privileges FROM users WHERE id = ${userId} FOR UPDATE`;
        if (!user) throw new Failure(404, 'users.user_not_found');
        if ((Number(user.privileges) & Privilege.Public) === 0)
          throw new Failure(403, 'site.forbidden');

        const { hand, deck } = dealHand(rng);
        // Stored before the deduction so a pending hand never costs a second bet, and before the
        // coins check so a pending hand is a 409 rather than a 402.
        const stored = await redis.set(
          key,
          JSON.stringify({ hand, deck, bet } satisfies Pending),
          'EX',
          HAND_TTL,
          'NX'
        );
        if (stored !== 'OK') throw new Failure(409, 'casino.hand_pending');
        claimed = true;
        if (user.coins < bet) throw new Failure(402, 'casino.insufficient_coins');

        await tx.$executeRaw`UPDATE users SET coins = coins - ${bet} WHERE id = ${userId}`;
        return { hand, bet, balance: user.coins - bet };
      });
    } catch (e) {
      // The bet never went through, so the hand mustn't stay playable for free.
      if (claimed) await redis.del(key).catch(() => {});
      throw e;
    }
  });
}

export async function draw(userId: number, rawHeld: unknown, rng: () => number = cryptoRng) {
  // A disabled game still lets a hand that's already paid for finish. It pays from the odds as
  // they are now, which an admin may have changed since the deal.
  const odds = parsePokerOdds((await gameConfig('poker')).odds);
  if (!odds) throw new Failure(403, 'casino.disabled');
  const held = parseHeld(rawHeld);
  await checkLimit('poker', userId);
  const key = handKey(userId);

  return withLock(userId, async () => {
    // Taken out of Redis before paying, so a hand can only ever be paid once.
    const raw = await redis.getdel(key);
    if (!raw) throw new Failure(404, 'casino.no_hand');
    const state = JSON.parse(raw) as Pending;
    const { bet } = state;
    const { hand, handRank, multiplier } = drawHand(state.hand, state.deck, held, odds, rng);
    const base = payoutFor(bet, multiplier);

    try {
      return await db.$transaction(async (tx) => {
        const [user] = await tx.$queryRaw<{ coins: number; privileges: bigint }[]>`
          SELECT coins, privileges FROM users WHERE id = ${userId} FOR UPDATE`;
        if (!user) throw new Failure(404, 'users.user_not_found');
        const payout = donorBuff(base, Number(user.privileges));
        const result = { hand, handRank, multiplier, payout: base };
        const stored = payout > 0 ? multiplier : 0;

        await tx.$executeRaw`UPDATE users SET coins = coins + ${payout} WHERE id = ${userId}`;
        await recordPlay(tx, { userId, game: 'poker', bet, multiplier: stored, payout, result });
        return { result, payout, multiplier: stored, balance: user.coins + payout };
      });
    } catch (e) {
      // Nothing was paid, so give the hand back to be drawn again.
      await redis.set(key, raw, 'EX', HAND_TTL, 'NX').catch(() => {});
      throw e;
    }
  });
}

export async function pending(userId: number) {
  const state = await load(userId);
  return state && { hand: state.hand, bet: state.bet };
}
