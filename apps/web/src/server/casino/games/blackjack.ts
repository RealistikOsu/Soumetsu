import { MAX_MULTIPLIER, isAmount, isRecord, payoutFor, shuffle, toHundredths } from './types';
import { makeDeck, type Card } from './cards';

export type { Card };

export interface BlackjackOdds {
  blackjack: number;
  win: number;
  dealerHitsSoft17: boolean;
}

export type Outcome = 'blackjack' | 'win' | 'dealer_bust' | 'lose' | 'bust';

export interface Hand {
  player: Card[];
  dealer: Card[];
  deck: Card[];
}

function parseMultiplier(v: unknown): number | null {
  if (!isAmount(v)) return null;
  // Rounded the way history stores it, so the response, the row and payoutFor all agree.
  const rounded = toHundredths(v);
  return rounded > MAX_MULTIPLIER ? null : rounded;
}

export function parseBlackjackOdds(raw: unknown): BlackjackOdds | null {
  if (!isRecord(raw)) return null;
  const blackjack = parseMultiplier(raw.blackjack);
  const win = parseMultiplier(raw.win);
  const { dealerHitsSoft17 } = raw;
  if (blackjack === null || win === null || typeof dealerHitsSoft17 !== 'boolean') return null;
  return { blackjack, win, dealerHitsSoft17 };
}

// A doubled win pays `win` on twice the stake.
export const blackjackMax = (o: BlackjackOdds) => Math.max(o.blackjack, o.win * 2);

export const blackjackInfo = (o: BlackjackOdds) => ({ blackjack: o.blackjack, win: o.win });

const value = ({ rank }: Card) => (rank === 1 ? 11 : Math.min(rank, 10));

function tally(cards: Card[]) {
  let total = cards.reduce((sum, card) => sum + value(card), 0);
  let aces = cards.filter((c) => c.rank === 1).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const score = (cards: Card[]) => tally(cards).total;

export function deal(rng: () => number): Hand {
  const deck = shuffle(makeDeck(), rng);
  return { player: [deck[0], deck[2]], dealer: [deck[1], deck[3]], deck: deck.slice(4) };
}

export function hit(hand: Hand): Hand {
  const [card, ...deck] = hand.deck;
  return { ...hand, player: [...hand.player, card], deck };
}

// The casino hit every 17, soft or hard. With dealerHitsSoft17 off the dealer stands on any 17.
function dealerHits(cards: Card[], hitsSoft17: boolean) {
  const { total } = tally(cards);
  return total < 17 || (total === 17 && hitsSoft17);
}

export function stand(hand: Hand, odds: BlackjackOdds): { hand: Hand; outcome: Outcome } {
  let { dealer, deck } = hand;
  while (dealerHits(dealer, odds.dealerHitsSoft17)) {
    dealer = [...dealer, deck[0]];
    deck = deck.slice(1);
  }
  const next = { ...hand, dealer, deck };
  const dealerScore = score(dealer);
  if (dealerScore > 21) return { hand: next, outcome: 'dealer_bust' };
  // Ties go to the house, as in the casino.
  return { hand: next, outcome: score(hand.player) > dealerScore ? 'win' : 'lose' };
}

export const isNatural = (hand: Hand) => score(hand.player) === 21;

export const isBust = (hand: Hand) => score(hand.player) > 21;

export function payout(odds: BlackjackOdds, bet: number, outcome: Outcome) {
  if (outcome === 'blackjack') return payoutFor(bet, odds.blackjack);
  if (outcome === 'win' || outcome === 'dealer_bust') return payoutFor(bet, odds.win);
  return 0;
}
