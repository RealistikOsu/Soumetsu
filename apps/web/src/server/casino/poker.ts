import { dealHand, drawHand, parseHeld } from './games/poker';
import type { Card, PokerOdds } from './games/poker';
import { payoutFor } from './games/types';
import { cryptoRng } from './play';
import * as session from './session';

interface Hand {
  hand: Card[];
  deck: Card[];
  bet: number;
  payouts: PokerOdds['payouts'];
}

const codes = { pending: 'casino.hand_pending', missing: 'casino.no_hand' };

const view = ({ hand, bet }: Hand) => ({ hand, bet });

export async function deal(userId: number, rawBet: unknown, rng: () => number = cryptoRng) {
  const dealt = await session.begin(
    userId,
    'poker',
    rawBet,
    ({ payouts }: PokerOdds, bet, rng): Hand => ({ ...dealHand(rng), bet, payouts }),
    view,
    rng,
    { codes }
  );
  return { ...dealt.view, balance: dealt.balance };
}

export async function draw(userId: number, rawHeld: unknown, rng: () => number = cryptoRng) {
  const held = parseHeld(rawHeld);
  const played = await session.step(
    userId,
    'poker',
    (state: Hand, rng) => {
      const { bet, payouts } = state;
      const { hand, handRank, multiplier } = drawHand(
        state.hand,
        state.deck,
        held,
        { payouts },
        rng
      );
      const base = payoutFor(bet, multiplier);
      return {
        settle: { multiplier, base, result: { hand, handRank, multiplier, payout: base } },
        view: { hand, bet }
      };
    },
    rng,
    codes
  );
  if (!('result' in played)) throw new Error('A poker draw always settles');
  const { result, payout, multiplier, balance } = played;
  return { result, payout, multiplier, balance };
}

export const pending = (userId: number) => session.pending(userId, 'poker', view);
