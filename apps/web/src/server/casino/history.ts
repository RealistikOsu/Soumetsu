import type { Prisma } from '$server/generated/client';
import { db } from '$server/db';
import type { Game } from './games/types';

const PAGE_SIZE = 50;

export async function recordPlay(
  tx: Prisma.TransactionClient,
  row: {
    userId: number;
    game: Game;
    bet: number;
    multiplier: number;
    payout: number;
    result: unknown;
  }
) {
  await tx.casino_game_history.create({
    data: {
      user_id: row.userId,
      game_type: row.game,
      bet_amount: row.bet,
      multiplier: row.multiplier,
      payout: row.payout,
      result_data: row.result as Prisma.InputJsonValue
    }
  });
}

export interface HistoryRow {
  id: number;
  game: Game;
  bet: number;
  multiplier: number;
  payout: number;
  net: number;
  playedAt: string;
  result: unknown;
}

export async function historyFor(userId: number, page: number) {
  const where = { user_id: userId };
  const [total, found] = await Promise.all([
    db.casino_game_history.count({ where }),
    db.casino_game_history.findMany({
      where,
      orderBy: [{ played_at: 'desc' }, { id: 'desc' }],
      skip: Math.max(0, page) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);
  const rows: HistoryRow[] = found.map((row) => ({
    id: Number(row.id),
    game: row.game_type as Game,
    bet: row.bet_amount,
    multiplier: Number(row.multiplier),
    payout: row.payout,
    net: row.payout - row.bet_amount,
    playedAt: (row.played_at ?? new Date(0)).toISOString(),
    result: row.result_data
  }));
  return { total, rows };
}
