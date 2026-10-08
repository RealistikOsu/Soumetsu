import { describe, expect, mock, test } from 'bun:test';

let args: { skip: number; take: number; orderBy: unknown } | null = null;
const at = new Date('2026-10-08T12:00:00Z');
mock.module('$server/db', () => ({
  db: {
    casino_game_history: {
      count: async () => 120,
      findMany: async (query: { skip: number; take: number; orderBy: unknown }) => {
        args = query;
        return [
          {
            id: 7n,
            game_type: 'coinflip',
            bet_amount: 100,
            multiplier: { toString: () => '1.75', valueOf: () => 1.75 },
            payout: 175,
            result_data: { win: true },
            played_at: at
          },
          {
            id: 6n,
            game_type: 'coinflip',
            bet_amount: 100,
            multiplier: { toString: () => '0.00', valueOf: () => 0 },
            payout: 0,
            result_data: null,
            played_at: at
          }
        ];
      }
    }
  }
}));

const { historyFor } = await import('./history');

describe('historyFor', () => {
  test('paginates from 1, newest first', async () => {
    const { total } = await historyFor(1, 3);
    expect(total).toBe(120);
    expect(args?.skip).toBe(100);
    expect(args?.take).toBe(50);
    expect(args?.orderBy).toEqual([{ played_at: 'desc' }, { id: 'desc' }]);
    await historyFor(1, 1);
    expect(args?.skip).toBe(0);
  });

  test('maps rows', async () => {
    const { rows } = await historyFor(1, 1);
    expect(rows[0]).toEqual({
      id: 7,
      game: 'coinflip',
      bet: 100,
      multiplier: 1.75,
      payout: 175,
      net: 75,
      playedAt: at.toISOString(),
      result: { win: true }
    });
    expect(rows[1].net).toBe(-100);
    expect(rows[1].multiplier).toBe(0);
  });
});
