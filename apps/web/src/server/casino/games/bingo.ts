import type { GameRunner } from '../play';
import { MAX_MULTIPLIER, isAmount, isRecord, payoutFor } from './types';

export interface BingoOdds {
  maxCalls: number;
  lines: Record<string, number>;
}

export type BingoInput = Record<string, never>;

export type BingoResult = {
  grid: (number | null)[][];
  called: number[];
  markedGrid: boolean[][];
  won: boolean;
  wonLines: string[];
  multiplier: number;
  payout: number;
};

const BALLS = 75;
const LINE_COUNTS = ['1', '2', '3', '4', '5'];
const COLUMN_STARTS = [1, 16, 31, 46, 61];

// Cells are [col, row] into grid[col][row]. The names are the casino's, so "row0" is column 0.
const PATTERNS: { name: string; cells: [number, number][] }[] = [
  ...[0, 1, 2, 3, 4].map((c) => ({
    name: `row${c}`,
    cells: [0, 1, 2, 3, 4].map((r): [number, number] => [c, r])
  })),
  ...[0, 1, 2, 3, 4].map((r) => ({
    name: `col${r}`,
    cells: [0, 1, 2, 3, 4].map((c): [number, number] => [c, r])
  })),
  { name: 'diag_tl', cells: [0, 1, 2, 3, 4].map((i): [number, number] => [i, i]) },
  { name: 'diag_tr', cells: [0, 1, 2, 3, 4].map((i): [number, number] => [4 - i, i]) }
];

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const range = (start: number, length: number) => Array.from({ length }, (_, i) => start + i);

export function parseBingoOdds(raw: unknown): BingoOdds | null {
  if (!isRecord(raw)) return null;
  const { maxCalls, lines } = raw;
  if (!Number.isInteger(maxCalls) || (maxCalls as number) < 1 || (maxCalls as number) > BALLS)
    return null;
  if (!isRecord(lines)) return null;

  const outLines: Record<string, number> = {};
  for (const count of LINE_COUNTS) {
    const m = lines[count];
    if (!isAmount(m) || m > MAX_MULTIPLIER) return null;
    outLines[count] = m;
  }
  return { maxCalls: maxCalls as number, lines: outLines };
}

// The 5-line rate can't actually pay: one call completes at most three lines.
export const bingoMax = (o: BingoOdds) => Math.max(...Object.values(o.lines));

export const bingoInfo = (o: BingoOdds) => ({ maxCalls: o.maxCalls, lines: o.lines });

export const parseBingoInput = (): BingoInput => ({});

export const bingo: GameRunner<BingoOdds, BingoInput, BingoResult> = (odds, _input, bet, rng) => {
  const grid: (number | null)[][] = COLUMN_STARTS.map((start) =>
    shuffle(range(start, 15), rng).slice(0, 5)
  );
  grid[2][2] = null;
  const balls = shuffle(range(1, BALLS), rng);

  const markedGrid = grid.map((column) => column.map((n) => n === null));
  const called: number[] = [];
  let wonLines: string[] = [];
  for (const ball of balls.slice(0, odds.maxCalls)) {
    called.push(ball);
    grid.forEach((column, c) =>
      column.forEach((n, r) => {
        if (n === ball) markedGrid[c][r] = true;
      })
    );
    wonLines = PATTERNS.filter((p) => p.cells.every(([c, r]) => markedGrid[c][r])).map(
      (p) => p.name
    );
    if (wonLines.length > 0) break;
  }

  const won = wonLines.length > 0;
  const multiplier = won ? odds.lines[String(Math.min(wonLines.length, 5))] : 0;
  const payout = won ? payoutFor(bet, multiplier) : 0;
  return {
    result: { grid, called, markedGrid, won, wonLines, multiplier, payout },
    multiplier,
    payout
  };
};
