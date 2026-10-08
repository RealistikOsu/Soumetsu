import { Failure } from '$server/respond';
import type { GameRunner } from '../play';
import { MAX_MULTIPLIER, isAmount, isRecord, payoutFor } from './types';

export const BET_TYPES = [
  'straight',
  'red',
  'black',
  'even',
  'odd',
  'low',
  'high',
  'dozen1',
  'dozen2',
  'dozen3',
  'col1',
  'col2',
  'col3'
] as const;

export type BetType = (typeof BET_TYPES)[number];

type Colour = 'red' | 'black' | 'green';

export interface RouletteOdds {
  slots: number;
  red: number[];
  payouts: Record<BetType, number>;
}

export interface RouletteInput {
  betType: BetType;
  betNumber: number | null;
}

export type RouletteResult = {
  number: number;
  color: Colour;
  betType: BetType;
  betNumber: number | null;
  won: boolean;
  multiplier: number;
  payout: number;
};

// A double-zero wheel: 0 to 36, and the last slot is 00. Every bet predicate assumes that layout.
const SLOTS = 38;
const DOUBLE_ZERO = SLOTS - 1;
const isPocket = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 36;

const colourOf = (o: RouletteOdds, n: number): Colour =>
  n === 0 ? 'green' : o.red.includes(n) ? 'red' : 'black';

function wins(o: RouletteOdds, n: number, betType: BetType, betNumber: number | null) {
  const colour = colourOf(o, n);
  switch (betType) {
    case 'straight':
      return n === betNumber;
    case 'red':
      return colour === 'red';
    case 'black':
      return colour === 'black';
    case 'even':
      return n !== 0 && n % 2 === 0;
    case 'odd':
      return n % 2 === 1;
    case 'low':
      return n >= 1 && n <= 18;
    case 'high':
      return n >= 19 && n <= 36;
    case 'dozen1':
      return n >= 1 && n <= 12;
    case 'dozen2':
      return n >= 13 && n <= 24;
    case 'dozen3':
      return n >= 25 && n <= 36;
    case 'col1':
      return n !== 0 && n % 3 === 1;
    case 'col2':
      return n !== 0 && n % 3 === 2;
    case 'col3':
      return n !== 0 && n % 3 === 0;
  }
}

export function parseRouletteOdds(raw: unknown): RouletteOdds | null {
  if (!isRecord(raw)) return null;
  const { slots, red, payouts } = raw;
  if (slots !== SLOTS) return null;
  if (!Array.isArray(red) || red.length !== 18 || !red.every((n) => isPocket(n) && n > 0))
    return null;
  if (new Set(red).size !== red.length) return null;
  if (!isRecord(payouts)) return null;

  const outPayouts = {} as RouletteOdds['payouts'];
  for (const betType of BET_TYPES) {
    const m = payouts[betType];
    if (!isAmount(m) || m > MAX_MULTIPLIER) return null;
    outPayouts[betType] = m;
  }
  return { slots, red: red as number[], payouts: outPayouts };
}

export const rouletteMax = (o: RouletteOdds) => Math.max(...Object.values(o.payouts));

export const rouletteInfo = (o: RouletteOdds) => ({ red: o.red, payouts: o.payouts });

export function parseRouletteInput(raw: unknown): RouletteInput {
  const { betType, betNumber } = isRecord(raw) ? raw : {};
  if (!BET_TYPES.includes(betType as BetType)) throw new Failure(400, 'site.invalid_request');
  if (betType !== 'straight') return { betType: betType as BetType, betNumber: null };
  if (!isPocket(betNumber)) throw new Failure(400, 'site.invalid_request');
  return { betType, betNumber };
}

export const roulette: GameRunner<RouletteOdds, RouletteInput, RouletteResult> = (
  odds,
  { betType, betNumber },
  bet,
  rng
) => {
  const pocket = Math.floor(rng() * odds.slots);
  // The casino showed 00 as 0, and 00 loses every bet.
  const number = pocket === DOUBLE_ZERO ? 0 : pocket;
  const won = pocket !== DOUBLE_ZERO && wins(odds, pocket, betType, betNumber);
  const multiplier = won ? odds.payouts[betType] : 0;
  const payout = won ? payoutFor(bet, multiplier) : 0;
  return {
    result: { number, color: colourOf(odds, number), betType, betNumber, won, multiplier, payout },
    multiplier,
    payout
  };
};
