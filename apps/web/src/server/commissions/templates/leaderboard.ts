import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import type { PlayerContext } from '../context';
import { optional, type DayScore } from '../scores';
import { once, template, type Template } from './types';

// Each candidate costs a ranking query, so only the day's strongest plays are looked up.
const CANDIDATES = 20;

type Placed = {
  score: DayScore;
  rank: number;
  previousFirst: number | null;
  previousFirstValue: number | null;
};

const TABLES = ['scores', 'scores_relax', 'scores_ap'];

// Separate from the checks so tests can stand in for the database.
export const queries = {
  // Any earlier pass counts: setting a new best demotes the old one below completed = 3.
  async priorBest(ctx: PlayerContext, play: DayScore): Promise<number | null> {
    if (play.source === 'stable') {
      const [row] = await db.$queryRaw<{ best: number | null }[]>(Prisma.sql`
        SELECT MAX(pp) AS best FROM ${Prisma.raw(TABLES[play.variant])}
        WHERE userid = ${ctx.id} AND beatmap_md5 = ${play.md5} AND play_mode = ${play.mode}
          AND completed >= 1 AND time < ${ctx.window.startUnix}`);
      return row?.best == null ? null : Number(row.best);
    }
    const metric = play.variant === 0 ? Prisma.sql`total_score` : Prisma.sql`pp`;
    const [row] = await optional(db.$queryRaw<{ best: number | null }[]>`
      SELECT MAX(${metric}) AS best FROM lazer_scores
      WHERE user_id = ${ctx.id} AND beatmap_id = ${play.beatmapId} AND ruleset_id = ${play.mode}
        AND variant = ${play.variant} AND passed = 1 AND ranked_mods = 1 AND ended_at < ${ctx.window.start}`);
    return row?.best == null ? null : Number(row.best);
  }
};

async function stole(ctx: PlayerContext, play: Placed) {
  if (play.rank !== 1 || play.previousFirst === null || play.previousFirstValue === null)
    return false;
  const prior = await queries.priorBest(ctx, play.score);
  return prior === null || prior < play.previousFirstValue;
}

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
  progress: (plays: Placed[]) => number,
  target = 1
) =>
  template({
    key,
    family: 'leaderboard',
    tier,
    roll: once,
    target: () => target,
    check: async (ctx) => progress(await placed(ctx))
  });

const some = (plays: Placed[], predicate: (play: Placed) => boolean) =>
  plays.some(predicate) ? 1 : 0;

export const leaderboard: Template[] = [
  board('leaderboard_first', 'hard', (plays) => some(plays, (p) => p.rank === 1)),
  board('leaderboard_three_firsts', 'hard', (plays) => plays.filter((p) => p.rank === 1).length, 3),
  template({
    key: 'leaderboard_steal',
    family: 'leaderboard',
    tier: 'hard',
    roll: once,
    target: () => 1,
    check: async (ctx) => {
      for (const play of await placed(ctx)) if (await stole(ctx, play)) return 1;
      return 0;
    }
  }),
  board('leaderboard_top10', 'medium', (plays) => some(plays, (p) => p.rank <= 10)),
  board('leaderboard_top50_stars', 'medium', (plays) =>
    some(plays, (p) => p.rank <= 50 && p.score.map.stars >= 5)
  )
];
