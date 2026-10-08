import { Failure } from '$server/respond';
import { minesMultiplier, parseMineCount, parseTile, placeMines } from './games/mines';
import type { MinesOdds } from './games/mines';
import { isRecord, payoutFor } from './games/types';
import { cryptoRng } from './play';
import * as session from './session';
import type { Settle, StepOutcome } from './session';

interface Board {
  bet: number;
  count: number;
  mines: number[];
  revealed: number[];
  odds: MinesOdds;
}

export interface MinesResult {
  [key: string]: number | number[] | boolean | null;
  mines: number[];
  revealed: number[];
  hit: number | null;
  cashedOut: boolean;
}

// Built field by field so the mine positions can never leak into a running game.
export function view({ bet, count, revealed, odds }: Board) {
  const left = odds.grid - count - revealed.length;
  return {
    bet,
    count,
    revealed,
    multiplier: minesMultiplier(odds, count, revealed.length),
    next: left > 0 ? minesMultiplier(odds, count, revealed.length + 1) : null
  };
}

export type MinesView = ReturnType<typeof view>;

function cashOut(board: Board): Settle<MinesResult> {
  const { bet, count, mines, revealed, odds } = board;
  const result = { mines, revealed, hit: null, cashedOut: true };
  if (revealed.length === 0) return { multiplier: 1, base: bet, result, refund: true };
  const multiplier = minesMultiplier(odds, count, revealed.length);
  return { multiplier, base: payoutFor(bet, multiplier), result };
}

export async function start(userId: number, raw: unknown, rng: () => number = cryptoRng) {
  const { bet, mines } = isRecord(raw) ? raw : {};
  return session.begin(
    userId,
    'mines',
    bet,
    (odds: MinesOdds, bet, rng, count: number): Board => ({
      bet,
      count,
      mines: placeMines(odds.grid, count, rng),
      revealed: [],
      odds
    }),
    view,
    rng,
    { parse: (odds: MinesOdds) => parseMineCount(mines, odds.grid) }
  );
}

export async function reveal(userId: number, rawTile: unknown) {
  return session.step(
    userId,
    'mines',
    (board: Board): StepOutcome<Board, MinesView, MinesResult> => {
      const tile = parseTile(rawTile, board.odds.grid);
      if (board.revealed.includes(tile)) throw new Failure(400, 'casino.invalid_move');

      if (board.mines.includes(tile)) {
        const result = {
          mines: board.mines,
          revealed: board.revealed,
          hit: tile,
          cashedOut: false
        };
        return { settle: { multiplier: 0, base: 0, result }, view: view(board) };
      }

      const next = { ...board, revealed: [...board.revealed, tile] };
      if (next.revealed.length === board.odds.grid - board.count)
        return { settle: cashOut(next), view: view(next) };
      return { state: next, view: view(next) };
    }
  );
}

export async function cashout(userId: number) {
  const played = await session.step(userId, 'mines', (board: Board) => ({
    settle: cashOut(board),
    view: view(board)
  }));
  if (!('result' in played)) throw new Error('A mines cash out always settles');
  return played;
}

export const pending = (userId: number) => session.pending(userId, 'mines', view);
