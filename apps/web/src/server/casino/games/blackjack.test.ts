import { describe, expect, test } from 'bun:test';
import { cards, stacked } from '../../../../test/cards';
import {
  blackjackInfo,
  blackjackMax,
  deal,
  hit,
  parseBlackjackOdds,
  payout,
  score,
  stand
} from './blackjack';
import type { BlackjackOdds, Hand } from './blackjack';
import { makeDeck } from './cards';

const odds = parseBlackjackOdds({
  blackjack: 2.2,
  win: 2,
  dealerHitsSoft17: true
}) as BlackjackOdds;

const hand = (player: string, dealer: string, deck = ''): Hand => ({
  player: cards(player),
  dealer: cards(dealer),
  deck: cards(deck)
});

describe('parseBlackjackOdds', () => {
  test('reads the seeded odds', () => {
    expect(odds).toEqual({ blackjack: 2.2, win: 2, dealerHitsSoft17: true });
  });

  test('rejects bad shapes', () => {
    for (const raw of [
      null,
      [],
      {},
      { blackjack: 2.2, win: 2 },
      { blackjack: 2.2, win: 2, dealerHitsSoft17: 'yes' },
      { blackjack: '2.2', win: 2, dealerHitsSoft17: true },
      { blackjack: 2.2, win: -1, dealerHitsSoft17: true },
      { blackjack: 10000, win: 2, dealerHitsSoft17: true }
    ])
      expect(parseBlackjackOdds(raw)).toBeNull();
  });

  test('max covers a doubled win, info hides the dealer rule', () => {
    expect(blackjackMax(odds)).toBe(4);
    expect(blackjackMax({ ...odds, blackjack: 5 })).toBe(5);
    expect(blackjackInfo(odds)).toEqual({ blackjack: 2.2, win: 2 });
  });
});

describe('deal', () => {
  test('deals player, dealer, player, dealer from a 51-draw shuffle', () => {
    const rng = stacked('2S 3H 4D 5C 6S');
    const dealt = deal(rng);
    expect(rng.used()).toBe(51);
    expect(dealt.player).toEqual(cards('2S 4D'));
    expect(dealt.dealer).toEqual(cards('3H 5C'));
    expect(dealt.deck).toHaveLength(48);
    expect(dealt.deck[0]).toEqual(cards('6S')[0]);
  });

  test('the deck is suit-major from the ace', () => {
    const deck = makeDeck();
    expect(deck.slice(0, 2)).toEqual(cards('AS 2S'));
    expect(deck[13]).toEqual(cards('AH')[0]);
    expect(deck[51]).toEqual({ suit: 'C', rank: 13 });
  });
});

describe('score', () => {
  test('counts aces soft until they would bust', () => {
    expect(score(cards('AS KH'))).toBe(21);
    expect(score(cards('AS AH'))).toBe(12);
    expect(score(cards('AS 6H 9D'))).toBe(16);
    expect(score(cards('AS AH 9D'))).toBe(21);
    expect(score(cards('KS QH 5D'))).toBe(25);
  });
});

describe('hit', () => {
  test('draws from the front of the deck', () => {
    const next = hit(hand('5S 6H', '9D 7C', '4S 8H'));
    expect(next.player).toEqual(cards('5S 6H 4S'));
    expect(next.deck).toEqual(cards('8H'));
  });
});

describe('stand', () => {
  test('the dealer hits a hard 17', () => {
    const { hand: done } = stand(hand('TS 9H', 'TD 7C', '2S 5H'), odds);
    expect(done.dealer).toEqual(cards('TD 7C 2S'));
  });

  test('the dealer hits a soft 17 when the odds say so', () => {
    const { hand: done } = stand(hand('TS 9H', 'AD 6C', '2S 5H'), odds);
    expect(done.dealer).toEqual(cards('AD 6C 2S'));
  });

  test('without dealerHitsSoft17 the dealer stands on every 17', () => {
    const standing = { ...odds, dealerHitsSoft17: false };
    expect(stand(hand('TS 9H', 'AD 6C', '2S'), standing).hand.dealer).toEqual(cards('AD 6C'));
    expect(stand(hand('TS 9H', 'TD 7C', '2S'), standing).hand.dealer).toEqual(cards('TD 7C'));
    expect(stand(hand('TS 9H', 'TD 6C', '2S'), standing).hand.dealer).toEqual(cards('TD 6C 2S'));
  });

  test('the dealer stands on 18', () => {
    const { hand: done, outcome } = stand(hand('TS 9H', 'TD 8C', '2S'), odds);
    expect(done.dealer).toEqual(cards('TD 8C'));
    expect(done.deck).toEqual(cards('2S'));
    expect(outcome).toBe('win');
  });

  test('a tie is a push', () => {
    expect(stand(hand('TS 8H', 'TD 8C'), odds).outcome).toBe('push');
  });

  test('a dealer over 21 is a dealer bust', () => {
    expect(stand(hand('TS 2H', 'TD 6C', 'KS'), odds).outcome).toBe('dealer_bust');
  });
});

describe('payout', () => {
  test('a push gives the bet back', () => {
    expect(payout(odds, 100, 'push')).toBe(100);
    expect(payout(odds, 100, 'dealer_blackjack')).toBe(0);
  });

  test('pays from the odds', () => {
    expect(payout(odds, 15, 'blackjack')).toBe(33);
    expect(payout(odds, 7, 'blackjack')).toBe(15);
    expect(payout(odds, 100, 'win')).toBe(200);
    expect(payout(odds, 100, 'dealer_bust')).toBe(200);
    expect(payout(odds, 100, 'lose')).toBe(0);
    expect(payout(odds, 100, 'bust')).toBe(0);
  });
});
