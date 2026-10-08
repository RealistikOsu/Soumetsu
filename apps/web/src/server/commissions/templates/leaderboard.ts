import type { PlayerContext } from '../context';
import type { DayScore } from '../scores';
import { once, template, type Template } from './types';

// Each candidate costs a ranking query, so only the day's strongest plays are looked up.
const CANDIDATES = 20;

type Placed = { score: DayScore; rank: number; previousFirst: number | null };

async function placed(ctx: PlayerContext): Promise<Placed[]> {
  const best = (await ctx.scores())
    .filter((s) => s.passed && s.isBest)
    .sort((a, b) => b.pp - a.pp)
    .slice(0, CANDIDATES);
  return Promise.all(best.map(async (score) => ({ score, ...(await ctx.leaderboardRank(score)) })));
}

const board = (
  key: string,
  tier: Template['tier'],
  progress: (plays: Placed[], ctx: PlayerContext) => number,
  target = 1
) =>
  template({
    key,
    family: 'leaderboard',
    tier,
    roll: once,
    target: () => target,
    check: async (ctx) => progress(await placed(ctx), ctx)
  });

const some = (plays: Placed[], predicate: (play: Placed) => boolean) =>
  plays.some(predicate) ? 1 : 0;

export const leaderboard: Template[] = [
  board('leaderboard_first', 'hard', (plays) => some(plays, (p) => p.rank === 1)),
  board('leaderboard_three_firsts', 'hard', (plays) => plays.filter((p) => p.rank === 1).length, 3),
  board('leaderboard_steal', 'hard', (plays, ctx) =>
    some(plays, (p) => p.rank === 1 && p.previousFirst !== null && p.previousFirst !== ctx.id)
  ),
  board('leaderboard_top10', 'medium', (plays) => some(plays, (p) => p.rank <= 10)),
  board('leaderboard_top50_stars', 'medium', (plays) =>
    some(plays, (p) => p.rank <= 50 && p.score.map.stars >= 5)
  )
];
