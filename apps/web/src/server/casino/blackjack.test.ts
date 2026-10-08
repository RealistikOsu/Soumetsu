import { beforeEach, describe, expect, test } from 'bun:test';
import { mockCasinoStore } from '../../../test/casino';
import { cards, stacked } from '../../../test/cards';

let config: object | null = null;
let user: { coins: number; privileges: bigint } | null = null;
let updates: unknown[][] = [];
let history: Record<string, unknown>[] = [];
let keys: Record<string, string> = {};

mockCasinoStore({
  config: () => config,
  user: () => user,
  updates: () => updates,
  history: () => history,
  keys: () => keys
});

const { clearConfigCache } = await import('./config');
const { double, hit, pendingHand, stand, start } = await import('./blackjack');

const odds = { blackjack: 2.2, win: 2, dealerHitsSoft17: true };
const KEY = 'casino:blackjack:1';

function table(player: string, dealer: string, deck = '', bet = 100) {
  keys[KEY] = JSON.stringify({
    player: cards(player),
    dealer: cards(dealer),
    deck: cards(deck),
    bet,
    odds
  });
}

beforeEach(() => {
  clearConfigCache();
  config = { min_bet: 10, max_bet: 1000, enabled: true, config_json: odds };
  user = { coins: 1000, privileges: 1n };
  updates = [];
  history = [];
  keys = {};
});

const hidden = (value: unknown) => {
  const json = JSON.stringify(value);
  expect(json).not.toContain('deck');
  return json;
};

describe('start', () => {
  test('takes the bet and shows only the up card', async () => {
    const started = await start(1, 100, stacked('TS 9H 7D 5C 2S'));
    expect(started).toEqual({
      view: {
        bet: 100,
        player: cards('TS 7D'),
        playerScore: 17,
        dealer: cards('9H'),
        dealerScore: 9,
        canDouble: true
      },
      balance: 900
    });
    hidden(started);
    expect(started.view.dealer).toHaveLength(1);
    expect(updates).toEqual([[100, 1]]);
    const stored = JSON.parse(keys[KEY]);
    expect(stored.dealer).toEqual(cards('9H 5C'));
    expect(stored.deck[0]).toEqual(cards('2S')[0]);
    expect(stored.deck).toHaveLength(48);
  });

  test('a natural pays at once and stores nothing', async () => {
    const played = await start(1, 100, stacked('AS 9H KD 5C'));
    const result = {
      player: cards('AS KD'),
      dealer: cards('9H 5C'),
      playerScore: 21,
      dealerScore: 14,
      outcome: 'blackjack'
    };
    expect(played).toMatchObject({ result, payout: 220, multiplier: 2.2, balance: 1120 });
    expect(updates).toEqual([[100, 220, 1]]);
    expect(history).toEqual([
      {
        user_id: 1,
        game_type: 'blackjack',
        bet_amount: 100,
        multiplier: 2.2,
        payout: 220,
        result_data: result
      }
    ]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('the dealer peeks: a dealer natural ends the hand on the deal', async () => {
    const played = await start(1, 100, stacked('TS AH 9D KC'));
    expect(played).toMatchObject({
      result: { outcome: 'dealer_blackjack', dealerScore: 21 },
      payout: 0,
      multiplier: 0
    });
    expect(keys[KEY]).toBeUndefined();
  });

  test('two naturals push', async () => {
    const played = await start(1, 100, stacked('AS AH KD QC'));
    expect(played).toMatchObject({ result: { outcome: 'push' }, payout: 100, multiplier: 1 });
    expect(keys[KEY]).toBeUndefined();
  });

  test('a natural on an odd bet records the real ratio', async () => {
    const played = await start(1, 15, stacked('AS 9H KD 5C'));
    expect(played).toMatchObject({ payout: 33, multiplier: 2.2 });
    const odd = await start(1, 17, stacked('AS 9H KD 5C'));
    // floor(17 × 2.2) is 37, and 37 / 17 is 2.176…
    expect(odd).toMatchObject({ payout: 37, multiplier: 2.18 });
  });

  test('a running game is a 409, even for a natural', async () => {
    table('5S 6H', '9D 7C');
    for (const rng of [stacked('TS 9H 7D 5C'), stacked('AS 9H KD 5C')])
      await expect(start(1, 100, rng)).rejects.toMatchObject({
        status: 409,
        code: 'casino.game_pending'
      });
    expect(updates).toEqual([]);
  });
});

describe('hit', () => {
  test('draws a card and keeps the game going', async () => {
    table('5S 6H', '9D 7C', '4S 8H');
    const played = await hit(1);
    expect(played).toEqual({
      view: {
        bet: 100,
        player: cards('5S 6H 4S'),
        playerScore: 15,
        dealer: cards('9D'),
        dealerScore: 9,
        canDouble: false
      }
    });
    hidden(played);
    expect(JSON.parse(keys[KEY]).deck).toEqual(cards('8H'));
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
    expect(await pendingHand(1)).toEqual(played.view);
  });

  test('hitting to 21 does not stand', async () => {
    table('5S 6H', '9D 7C', 'TS');
    const played = await hit(1);
    expect(played).not.toHaveProperty('result');
    expect(played.view.playerScore).toBe(21);
    expect(keys[KEY]).toBeDefined();
  });

  test('over 21 is a bust', async () => {
    table('TS 6H', '9D 7C', 'KS');
    const played = await hit(1);
    expect(played).toMatchObject({
      result: { playerScore: 26, dealer: cards('9D 7C'), outcome: 'bust' },
      payout: 0,
      multiplier: 0,
      balance: 1000
    });
    expect(history).toMatchObject([{ bet_amount: 100, multiplier: 0, payout: 0 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('without a game is a 404', async () => {
    await expect(hit(1)).rejects.toMatchObject({ status: 404, code: 'casino.no_game' });
  });
});

describe('stand', () => {
  test('a higher hand wins the buffed payout', async () => {
    user = { coins: 900, privileges: 1n | 4n };
    table('TS 9H', 'TD 8C', '2S');
    const played = await stand(1);
    const result = {
      player: cards('TS 9H'),
      dealer: cards('TD 8C'),
      playerScore: 19,
      dealerScore: 18,
      outcome: 'win'
    };
    expect(played).toMatchObject({ result, payout: 210, multiplier: 2, balance: 1110 });
    expect(history).toMatchObject([{ bet_amount: 100, multiplier: 2, payout: 210 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('the dealer hits 17 and busts', async () => {
    table('TS 2H', 'TD 7C', 'KS');
    const played = await stand(1);
    expect(played).toMatchObject({
      result: { dealer: cards('TD 7C KS'), dealerScore: 27, outcome: 'dealer_bust' },
      payout: 200
    });
  });

  test('a tie is a push and gives the bet back', async () => {
    table('TS 8H', 'TD 8C');
    const played = await stand(1);
    expect(played).toMatchObject({ result: { outcome: 'push' }, payout: 100, multiplier: 1 });
  });
});

describe('double', () => {
  test('takes a second bet and pays the win on both', async () => {
    table('5S 6H', 'TD 7C', 'TS 2H');
    const played = await double(1);
    const result = {
      player: cards('5S 6H TS'),
      dealer: cards('TD 7C 2H'),
      playerScore: 21,
      dealerScore: 19,
      outcome: 'win'
    };
    expect(played).toMatchObject({ result, payout: 400, multiplier: 2, balance: 1300 });
    expect(played.view).toMatchObject({ bet: 200, canDouble: false });
    expect(updates).toEqual([[100, 400, 1]]);
    expect(history).toMatchObject([{ bet_amount: 200, multiplier: 2, payout: 400 }]);
    expect(keys[KEY]).toBeUndefined();
  });

  test('a bust on the double loses both bets', async () => {
    table('9S 6H', 'TD 7C', 'KS');
    const played = await double(1);
    expect(played).toMatchObject({ result: { outcome: 'bust' }, payout: 0, balance: 900 });
    expect(updates).toEqual([[100, 0, 1]]);
    expect(history).toMatchObject([{ bet_amount: 200, multiplier: 0, payout: 0 }]);
  });

  test('after a hit is a 400 and changes nothing', async () => {
    table('2S 3H 4D', 'TD 7C', 'KS');
    const stored = keys[KEY];
    await expect(double(1)).rejects.toMatchObject({ status: 400, code: 'casino.invalid_move' });
    expect(keys[KEY]).toBe(stored);
    expect(updates).toEqual([]);
  });

  test('without the coins is a 402 and leaves the game as it was', async () => {
    user = { coins: 50, privileges: 1n };
    table('5S 6H', 'TD 7C', 'TS 2H');
    const stored = keys[KEY];
    await expect(double(1)).rejects.toMatchObject({
      status: 402,
      code: 'casino.insufficient_coins'
    });
    expect(keys[KEY]).toBe(stored);
    expect(updates).toEqual([]);
    expect(history).toEqual([]);
  });
});

describe('pendingHand', () => {
  test('hides the deck and the hole card', async () => {
    table('5S 6H', '9D 7C', '4S 8H');
    const view = await pendingHand(1);
    expect(view).toEqual({
      bet: 100,
      player: cards('5S 6H'),
      playerScore: 11,
      dealer: cards('9D'),
      dealerScore: 9,
      canDouble: true
    });
    expect(hidden(view)).not.toContain('"rank":7,"suit":"C"');
  });

  test('is null without a game', async () => {
    expect(await pendingHand(1)).toBeNull();
  });
});
