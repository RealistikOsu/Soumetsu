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

export interface SlotsOdds extends SymbolOdds {
  columnFactor: number;
}

export type SlotsInput = Record<string, never>;

export type SlotsResult = {
  grid: string[][];
  paylines: { line: string; symbol: string; multiplier: number }[];
  totalMultiplier: number;
  payout: number;
};

// grid[col][row]; each line names the row it reads in columns 0, 1 and 2.
const LINES = [
  { name: 'top', rows: [0, 0, 0] },
  { name: 'middle', rows: [1, 1, 1] },
  { name: 'bottom', rows: [2, 2, 2] },
  { name: 'diagonal_down', rows: [0, 1, 2] },
  { name: 'diagonal_up', rows: [2, 1, 0] }
];

// The casino never paid a column of Cherries, only the rows and diagonals.
const UNPAID_COLUMN = 'Cherry';

const columnLine = (o: SlotsOdds, symbol: string) =>
  Math.floor(o.multipliers[symbol] * o.columnFactor * 100) / 100;

export function parseSlotsOdds(raw: unknown): SlotsOdds | null {
  if (!isRecord(raw)) return null;
  const symbols = parseSymbolOdds(raw);
  if (!symbols || !isAmount(raw.columnFactor)) return null;
  const odds = { ...symbols, columnFactor: raw.columnFactor };
  return slotsMax(odds) > MAX_MULTIPLIER ? null : odds;
}

export const slotsMax = (o: SlotsOdds) =>
  Math.max(...o.symbols.map((s) => toHundredths(5 * o.multipliers[s] + 3 * columnLine(o, s))));

export const slotsInfo = (o: SlotsOdds) => ({
  symbols: o.symbols,
  multipliers: o.multipliers,
  columnFactor: o.columnFactor
});

export const parseSlotsInput = (): SlotsInput => ({});

export const slots: GameRunner<SlotsOdds, SlotsInput, SlotsResult> = (odds, _input, bet, rng) => {
  const grid = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => pickWeighted(odds, rng))
  );
  const paylines: SlotsResult['paylines'] = [];

  grid.forEach(([s0, s1, s2], col) => {
    if (s0 === s1 && s1 === s2 && s0 !== UNPAID_COLUMN)
      paylines.push({ line: `column_${col}`, symbol: s0, multiplier: columnLine(odds, s0) });
  });

  for (const { name, rows } of LINES) {
    const [s0, s1, s2] = rows.map((row, col) => grid[col][row]);
    if (s0 === s1 && s1 === s2)
      paylines.push({ line: name, symbol: s0, multiplier: odds.multipliers[s0] });
  }

  const totalMultiplier = toHundredths(paylines.reduce((sum, p) => sum + p.multiplier, 0));
  const payout = payoutFor(bet, totalMultiplier);
  return {
    result: { grid, paylines, totalMultiplier, payout },
    multiplier: totalMultiplier,
    payout
  };
};
