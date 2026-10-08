import type { CasinoRow } from '../context';
import { once, template, type Template } from './types';

const game = (
  key: string,
  tier: Template['tier'],
  progress: (rows: CasinoRow[]) => number,
  target = 1
) =>
  template({
    key,
    family: 'casino',
    tier,
    roll: once,
    target: () => target,
    check: async (ctx) => progress(await ctx.casino()),
    // The client maps this to the casino's URL.
    link: () => 'casino'
  });

const some = (rows: CasinoRow[], predicate: (row: CasinoRow) => boolean) =>
  rows.some(predicate) ? 1 : 0;

export const casino: Template[] = [
  game('casino_play', 'easy', (rows) => (rows.length >= 1 ? 1 : 0)),
  game('casino_three_games', 'medium', (rows) => new Set(rows.map((row) => row.game)).size, 3),
  template({
    key: 'casino_new_game',
    family: 'casino',
    tier: 'medium',
    roll: once,
    target: () => 1,
    check: async (ctx) => {
      const rows = await ctx.casino();
      if (!rows.length) return 0;
      const earlier = await ctx.weekGames();
      return rows.some((row) => !earlier.includes(row.game)) ? 1 : 0;
    },
    link: () => 'casino'
  }),
  template({
    key: 'casino_wager',
    family: 'casino',
    tier: 'medium',
    roll: (ctx) => ({ coins: Math.max(50, Math.round(ctx.coins / 10)) }),
    target: (params) => Number(params.coins),
    check: async (ctx) => (await ctx.casino()).reduce((sum, row) => sum + row.bet, 0),
    link: () => 'casino'
  }),
  game('casino_big_win', 'hard', (rows) => some(rows, (row) => row.multiplier >= 3)),
  game('casino_blackjack', 'easy', (rows) =>
    some(rows, (row) => row.game === 'blackjack' && row.payout > row.bet)
  ),
  game('casino_slots_10x', 'hard', (rows) =>
    some(rows, (row) => row.game === 'slots' && row.multiplier >= 10)
  ),
  game('casino_aviator', 'medium', (rows) =>
    some(rows, (row) => row.game === 'aviator' && row.multiplier >= 2 && row.payout > 0)
  ),
  // Lane count isn't stored, so five lanes is read as a 2x cash-out.
  game('casino_chicken', 'medium', (rows) =>
    some(rows, (row) => row.game === 'chicken_road' && row.multiplier >= 2)
  ),
  game('casino_profit', 'medium', (rows) =>
    rows.reduce((sum, row) => sum + row.payout - row.bet, 0) > 0 ? 1 : 0
  ),
  template({
    key: 'casino_shop',
    family: 'casino',
    tier: 'medium',
    roll: once,
    target: () => 1,
    check: async (ctx) => ((await ctx.casinoPurchases()) >= 1 ? 1 : 0),
    link: () => '/shop'
  }),
  game('casino_lose', 'easy', (rows) => some(rows, (row) => row.payout < row.bet))
];
