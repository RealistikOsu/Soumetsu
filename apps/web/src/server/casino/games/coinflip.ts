import { Failure } from '$server/respond';
import { payoutFor } from '../play';
import type { GameRunner } from '../play';
import type { CoinflipOdds } from './types';

type Side = 'heads' | 'tails';

export interface CoinflipInput {
  choice: Side;
}

export type CoinflipResult = { outcome: Side; choice: Side; won: boolean };

export function parseCoinflipInput(raw: unknown): CoinflipInput {
  const choice = (raw as { choice?: unknown } | null)?.choice;
  if (choice !== 'heads' && choice !== 'tails') throw new Failure(400, 'site.invalid_request');
  return { choice };
}

// The casino flipped on one random byte & 1, which splits the same way.
export const coinflip: GameRunner<CoinflipOdds, CoinflipInput, CoinflipResult> = (
  odds,
  { choice },
  bet,
  rng
) => {
  const outcome: Side = rng() < 0.5 ? 'heads' : 'tails';
  const won = outcome === choice;
  return {
    result: { outcome, choice, won },
    multiplier: odds.multiplier,
    payout: won ? payoutFor(bet, odds.multiplier) : 0
  };
};
