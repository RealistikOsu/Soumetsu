import type { GameRunner } from '../play';
import {
  MAX_MULTIPLIER,
  isAmount,
  isRecord,
  parseSymbolOdds,
  payoutFor,
  pickWeighted,
  toHundredths
} from './types';
import type { SymbolOdds } from './types';

export interface ZeusOdds extends SymbolOdds {
  wildLightningChance: number;
  cols: number;
  rows: number;
}

export type ZeusInput = Record<string, never>;

export type ZeusResult = {
  grid: string[][];
  wildPositions: number[][];
  wins: { symbol: string; count: number; multiplier: number }[];
  totalMultiplier: number;
  payout: number;
};

const WILD = 'WILD';
const LIGHTNING = 'LIGHTNING';
const SCORING_ROW = 1;

const isCols = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 3 && v <= 10;

export function parseZeusOdds(raw: unknown): ZeusOdds | null {
  if (!isRecord(raw)) return null;
  const symbols = parseSymbolOdds(raw);
  const { wildLightningChance, cols, rows } = raw;
  if (!symbols || !isAmount(wildLightningChance) || wildLightningChance > 1) return null;
  if (!isCols(cols) || rows !== 3) return null;
  const odds = { ...symbols, wildLightningChance, cols, rows };
  return zeusMax(odds) > MAX_MULTIPLIER ? null : odds;
}

// A middle row of WILDs pays every symbol at full length.
export const zeusMax = (o: ZeusOdds) =>
  toHundredths(
    o.symbols.filter((s) => s !== WILD).reduce((sum, s) => sum + o.multipliers[s], 0) * (o.cols - 2)
  );

export const zeusInfo = (o: ZeusOdds) => ({ symbols: o.symbols, multipliers: o.multipliers });

export const parseZeusInput = (): ZeusInput => ({});

export const zeus: GameRunner<ZeusOdds, ZeusInput, ZeusResult> = (odds, _input, bet, rng) => {
  const grid = Array.from({ length: odds.cols }, () =>
    Array.from({ length: odds.rows }, () => pickWeighted(odds, rng))
  );

  const wildPositions: number[][] = [];
  grid.forEach((column, c) =>
    column.forEach((symbol, r) => {
      if (symbol === LIGHTNING && rng() < odds.wildLightningChance) {
        column[r] = WILD;
        wildPositions.push([c, r]);
      }
    })
  );

  const wins: ZeusResult['wins'] = [];
  for (const symbol of odds.symbols) {
    if (symbol === WILD) continue;
    let count = 0;
    for (const column of grid) {
      if (column[SCORING_ROW] !== symbol && column[SCORING_ROW] !== WILD) break;
      count++;
    }
    if (count >= 3)
      wins.push({ symbol, count, multiplier: odds.multipliers[symbol] * (count - 2) });
  }

  const totalMultiplier = toHundredths(wins.reduce((sum, w) => sum + w.multiplier, 0));
  const payout = payoutFor(bet, totalMultiplier);
  return {
    result: { grid, wildPositions, wins, totalMultiplier, payout },
    multiplier: totalMultiplier,
    payout
  };
};
