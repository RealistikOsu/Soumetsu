import { Failure } from '$server/respond';
import { MAX_MULTIPLIER, isAmount, isRecord } from './types';

export const HAND_RANKS = [
  'royal_flush',
  'straight_flush',
  'four_of_a_kind',
  'full_house',
  'flush',
  'straight',
  'three_of_a_kind',
  'two_pair',
  'jacks_or_better',
  'nothing'
] as const;

export type HandRank = (typeof HAND_RANKS)[number];

export interface PokerOdds {
  payouts: Record<HandRank, number>;
}

export type Suit = 'S' | 'H' | 'D' | 'C';

// Rank 1 is the ace, 11 to 13 are J, Q and K.
export type Card = { suit: Suit; rank: number };

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];

export function parsePokerOdds(raw: unknown): PokerOdds | null {
  if (!isRecord(raw) || !isRecord(raw.payouts)) return null;
  const given = raw.payouts;
  const payouts = {} as PokerOdds['payouts'];
  for (const rank of HAND_RANKS) {
    const value = rank === 'nothing' && given[rank] === undefined ? 0 : given[rank];
    if (!isAmount(value) || value > MAX_MULTIPLIER) return null;
    payouts[rank] = value;
  }
  return { payouts };
}

export const pokerMax = (o: PokerOdds) => Math.max(...Object.values(o.payouts));

export const pokerInfo = (o: PokerOdds) => ({ payouts: o.payouts });

function shuffle<T>(cards: T[], rng: () => number) {
  const d = [...cards];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function makeDeck() {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  return deck;
}

export function dealHand(rng: () => number) {
  const deck = shuffle(makeDeck(), rng);
  return { hand: deck.slice(0, 5), deck: deck.slice(5) };
}

export function classifyHand(hand: Card[]): HandRank {
  const ranks = hand.map((c) => c.rank).sort((a, b) => a - b);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const sizes = [...counts.values()].sort((a, b) => b - a);
  const isFlush = hand.every((c) => c.suit === hand[0].suit);
  const isRoyal =
    ranks[0] === 1 && ranks[1] === 10 && ranks[2] === 11 && ranks[3] === 12 && ranks[4] === 13;
  const isStraight = (ranks[4] - ranks[0] === 4 && new Set(ranks).size === 5) || isRoyal;

  if (isFlush && isRoyal) return 'royal_flush';
  if (isFlush && isStraight) return 'straight_flush';
  if (sizes[0] === 4) return 'four_of_a_kind';
  if (sizes[0] === 3 && sizes[1] === 2) return 'full_house';
  if (isFlush) return 'flush';
  if (isStraight) return 'straight';
  if (sizes[0] === 3) return 'three_of_a_kind';
  if (sizes[0] === 2 && sizes[1] === 2) return 'two_pair';
  if (sizes[0] === 2) {
    const pair = [...counts.entries()].find(([, c]) => c === 2)?.[0] ?? 0;
    if (pair === 1 || pair >= 11) return 'jacks_or_better';
  }
  return 'nothing';
}

// The casino reshuffled the cards left over at draw time, so this does too.
export function drawHand(
  hand: Card[],
  deck: Card[],
  held: boolean[],
  odds: PokerOdds,
  rng: () => number
) {
  const rest = shuffle(deck, rng);
  const next = hand.map((card, i) => (held[i] ? card : rest.shift()!));
  const handRank = classifyHand(next);
  return { hand: next, handRank, multiplier: odds.payouts[handRank] };
}

export function parseHeld(raw: unknown): boolean[] {
  if (!Array.isArray(raw) || raw.length !== 5 || !raw.every((h) => typeof h === 'boolean'))
    throw new Failure(400, 'site.invalid_request');
  return raw;
}
