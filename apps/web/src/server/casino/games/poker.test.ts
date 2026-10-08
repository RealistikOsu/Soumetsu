import { describe, expect, test } from 'bun:test';
import { sequence } from '../../../../test/rng';
import {
  classifyHand,
  dealHand,
  drawHand,
  parseHeld,
  parsePokerOdds,
  pokerInfo,
  pokerMax
} from './poker';
import type { Card, HandRank, PokerOdds } from './poker';

const seeded = {
  payouts: {
    royal_flush: 500,
    straight_flush: 35,
    four_of_a_kind: 15,
    full_house: 6,
    flush: 4,
    straight: 3,
    three_of_a_kind: 2,
    two_pair: 1.5,
    jacks_or_better: 0.8
  }
};

const odds = parsePokerOdds(seeded) as PokerOdds;

// 'AS' is the ace of spades, 'TH' the ten of hearts.
const RANKS: Record<string, number> = { A: 1, T: 10, J: 11, Q: 12, K: 13 };
const cards = (s: string): Card[] =>
  s.split(' ').map((c) => ({
    rank: RANKS[c[0]] ?? Number(c[0]),
    suit: c[1] as Card['suit']
  }));

describe('parsePokerOdds', () => {
  test('fills in nothing as zero', () => {
    expect(odds.payouts).toEqual({ ...seeded.payouts, nothing: 0 });
  });

  test('rejects bad shapes', () => {
    const missing: Record<string, number> = { ...seeded.payouts };
    delete missing.flush;
    for (const raw of [
      null,
      [],
      {},
      { payouts: [] },
      { payouts: missing },
      { payouts: { ...seeded.payouts, flush: -1 } },
      { payouts: { ...seeded.payouts, flush: '4' } },
      { payouts: { ...seeded.payouts, royal_flush: 10000 } },
      { payouts: { ...seeded.payouts, nothing: -1 } }
    ])
      expect(parsePokerOdds(raw)).toBeNull();
  });

  test('rounds payouts to hundredths', () => {
    const parsed = parsePokerOdds({
      payouts: { ...seeded.payouts, two_pair: 1.234 }
    });
    expect(parsed?.payouts.two_pair).toBe(1.23);
  });

  test('max and info', () => {
    expect(pokerMax(odds)).toBe(500);
    expect(pokerInfo(odds)).toEqual({ payouts: { ...seeded.payouts, nothing: 0 } });
  });
});

describe('classifyHand', () => {
  const table: [string, HandRank][] = [
    ['TS JS QS KS AS', 'royal_flush'],
    ['9H TH JH QH KH', 'straight_flush'],
    ['AD 2D 3D 4D 5D', 'straight_flush'],
    ['7S 7H 7D 7C 2S', 'four_of_a_kind'],
    ['3S 3H 3D 9C 9S', 'full_house'],
    ['2C 5C 9C JC KC', 'flush'],
    ['AS 2H 3D 4C 5S', 'straight'],
    ['TS JH QD KC AS', 'straight'],
    ['5S 6H 7D 8C 9S', 'straight'],
    ['8S 8H 8D 2C KS', 'three_of_a_kind'],
    ['4S 4H 9D 9C KS', 'two_pair'],
    ['JS JH 2D 5C 9S', 'jacks_or_better'],
    ['AS AH 2D 5C 9S', 'jacks_or_better'],
    ['KS KH 2D 5C 9S', 'jacks_or_better'],
    ['TS TH 2D 5C 9S', 'nothing'],
    ['2S 5H 9D JC KS', 'nothing'],
    ['QS KH AD 2C 3S', 'nothing']
  ];
  for (const [hand, rank] of table)
    test(`${hand} is ${rank}`, () => expect(classifyHand(cards(hand))).toBe(rank));
});

describe('dealHand', () => {
  test('deals five from a full deck and keeps the other 47', () => {
    const rng = sequence(Array(51).fill(0));
    const { hand, deck } = dealHand(rng);
    expect(rng.used()).toBe(51);
    expect(hand).toHaveLength(5);
    expect(deck).toHaveLength(47);
    const all = [...hand, ...deck].map((c) => `${c.suit}${c.rank}`);
    expect(new Set(all).size).toBe(52);
  });

  test('swaps with floor(rng * (i + 1)) over the S, H, D, C deck', () => {
    // rng 0.99 picks j = i every time, so the deck stays in order.
    const { hand, deck } = dealHand(() => 0.99);
    expect(hand).toEqual(cards('AS 2S 3S 4S 5S'));
    expect(deck[0]).toEqual({ suit: 'S', rank: 6 });
    expect(deck[46]).toEqual({ suit: 'C', rank: 13 });
  });
});

describe('drawHand', () => {
  const hand = cards('AS AH 2D 5C 9S');
  const deck = cards('KS KH KD 3C 4C');

  test('keeps held cards and fills the rest from the reshuffled deck in order', () => {
    const drawn = drawHand(hand, deck, [true, true, false, false, false], odds, () => 0.99);
    expect(drawn.hand).toEqual(cards('AS AH KS KH KD'));
    expect(drawn.handRank).toBe('full_house');
    expect(drawn.multiplier).toBe(6);
  });

  test('holding everything changes nothing', () => {
    const drawn = drawHand(hand, deck, [true, true, true, true, true], odds, () => 0);
    expect(drawn).toEqual({ hand, handRank: 'jacks_or_better', multiplier: 0.8 });
  });

  test('reshuffles before drawing', () => {
    // rng 0 swaps every card to the front in turn: KS KH KD 3C 4C -> KH KD 3C 4C KS.
    const drawn = drawHand(hand, deck, [false, true, true, true, true], odds, () => 0);
    expect(drawn.hand[0]).toEqual({ suit: 'H', rank: 13 });
  });
});

describe('parseHeld', () => {
  test('takes exactly five booleans', () => {
    expect(parseHeld([true, false, true, false, false])).toEqual([true, false, true, false, false]);
    for (const raw of [null, [], [true, true, true, true], [1, 0, 0, 0, 0], Array(6).fill(false)])
      expect(() => parseHeld(raw)).toThrow(
        expect.objectContaining({ status: 400, code: 'site.invalid_request' })
      );
  });
});
