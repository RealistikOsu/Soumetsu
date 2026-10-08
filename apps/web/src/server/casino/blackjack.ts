import { Failure } from '$server/respond';
import {
  deal,
  hit as draw,
  isBust,
  dealerNatural,
  isNatural,
  payout,
  score,
  stand as dealerTurn
} from './games/blackjack';
import type { BlackjackOdds, Card, Hand, Outcome } from './games/blackjack';
import { cryptoRng } from './play';
import * as session from './session';
import type { Settled, StepOutcome } from './session';

interface Table extends Hand {
  bet: number;
  odds: BlackjackOdds;
}

export type BlackjackResult = {
  player: Card[];
  dealer: Card[];
  playerScore: number;
  dealerScore: number;
  outcome: Outcome;
};

// Built field by field so the deck and the hole card never reach a running game.
function show({ bet, player, dealer }: Table, over: boolean) {
  const up = [dealer[0]];
  return {
    bet,
    player,
    playerScore: score(player),
    dealer: up,
    dealerScore: score(up),
    canDouble: !over && player.length === 2
  };
}

export const view = (table: Table) => show(table, false);

export type BlackjackView = ReturnType<typeof view>;

type Move = StepOutcome<Table, BlackjackView, BlackjackResult>;

// `bet` is the final stake, which a double has raised past the one in the stored table.
function finish(
  table: Table,
  bet: number,
  outcome: Outcome
): Settled<BlackjackView, BlackjackResult> {
  const { player, dealer, odds } = table;
  const base = payout(odds, bet, outcome);
  const result = {
    player,
    dealer,
    playerScore: score(player),
    dealerScore: score(dealer),
    outcome
  };
  return {
    settle: { multiplier: base / bet, base, result, refund: outcome === 'push' },
    view: show({ ...table, bet }, true)
  };
}

function standOn(table: Table, bet: number) {
  const { hand, outcome } = dealerTurn(table, table.odds);
  return finish({ ...table, ...hand }, bet, outcome);
}

export async function start(userId: number, rawBet: unknown, rng: () => number = cryptoRng) {
  return session.begin(
    userId,
    'blackjack',
    rawBet,
    (odds: BlackjackOdds, bet, rng): Table | Settled<BlackjackView, BlackjackResult> => {
      const table = { ...deal(rng), bet, odds };
      // The dealer peeks on the deal, so a dealer natural ends the hand before the player can act on it.
      if (dealerNatural(table))
        return finish(table, bet, isNatural(table) ? 'push' : 'dealer_blackjack');
      return isNatural(table) ? finish(table, bet, 'blackjack') : table;
    },
    view,
    rng
  );
}

export async function hit(userId: number) {
  return session.step(userId, 'blackjack', (table: Table): Move => {
    const next = { ...table, ...draw(table) };
    if (isBust(next)) return finish(next, next.bet, 'bust');
    return { state: next, view: view(next) };
  });
}

export async function stand(userId: number) {
  return session.step(userId, 'blackjack', (table: Table): Move => standOn(table, table.bet));
}

export async function double(userId: number) {
  return session.step(userId, 'blackjack', (table: Table): Move => {
    if (table.player.length !== 2) throw new Failure(400, 'casino.invalid_move');
    const next = { ...table, ...draw(table) };
    const bet = table.bet * 2;
    const settled = isBust(next) ? finish(next, bet, 'bust') : standOn(next, bet);
    return { ...settled, charge: table.bet };
  });
}

export const pendingHand = (userId: number) => session.pending(userId, 'blackjack', view);
