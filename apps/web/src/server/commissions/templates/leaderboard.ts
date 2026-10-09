import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import type { PlayerContext } from '../context';
import { optional, type DayScore } from '../scores';
import { once, template, type Template } from './types';

// Each candidate costs three board lookups, so only the day's strongest plays are looked up.
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
  // Each play's earlier best on the same board, in the order given. Any earlier pass counts: setting a new best
  // demotes the old one below completed = 3.
  async priorBests(ctx: PlayerContext, plays: DayScore[]): Promise<(number | null)[]> {
    const found: Record<string, number> = {};
    const stableKey = (variant: number, md5: string, mode: number) => `s:${variant}:${md5}:${mode}`;
    const lazerKey = (beatmapId: number, mode: number, variant: number) =>
      `l:${beatmapId}:${mode}:${variant}`;
    const stable = (variant: number) =>
      plays.filter((play) => play.source === 'stable' && play.variant === variant);
    const lazer = (byScore: boolean) =>
      plays.filter((play) => play.source === 'lazer' && (play.variant === 0) === byScore);

    await Promise.all([
      ...TABLES.map(async (table, variant) => {
        const md5s = [...new Set(stable(variant).map((play) => play.md5))];
        if (!md5s.length) return;
        const rows = await db.$queryRaw<{ beatmap_md5: string; mode: number; best: number }[]>(
          Prisma.sql`
            SELECT beatmap_md5, play_mode AS mode, MAX(pp) AS best FROM ${Prisma.raw(table)}
            WHERE userid = ${ctx.id} AND beatmap_md5 IN (${Prisma.join(md5s)})
              AND completed >= 1 AND time < ${ctx.window.startUnix}
            GROUP BY beatmap_md5, play_mode`
        );
        for (const row of rows)
          found[stableKey(variant, row.beatmap_md5, Number(row.mode))] = Number(row.best);
      }),
      ...[true, false].map(async (byScore) => {
        const ids = [...new Set(lazer(byScore).map((play) => play.beatmapId))];
        if (!ids.length) return;
        const metric = byScore ? Prisma.sql`total_score` : Prisma.sql`pp`;
        const rows = await optional(db.$queryRaw<
          { beatmap_id: number; mode: number; variant: number; best: number }[]
        >`
          SELECT beatmap_id, ruleset_id AS mode, variant, MAX(${metric}) AS best FROM lazer_scores
          WHERE user_id = ${ctx.id} AND beatmap_id IN (${Prisma.join(ids)})
            AND ${byScore ? Prisma.sql`variant = 0` : Prisma.sql`variant <> 0`}
            AND passed = 1 AND ranked_mods = 1 AND ended_at < ${ctx.window.start}
          GROUP BY beatmap_id, ruleset_id, variant`);
        for (const row of rows)
          found[lazerKey(Number(row.beatmap_id), Number(row.mode), Number(row.variant))] = Number(
            row.best
          );
      })
    ]);

    return plays.map(
      (play) =>
        found[
          play.source === 'stable'
            ? stableKey(play.variant, play.md5, play.mode)
            : lazerKey(play.beatmapId, play.mode, play.variant)
        ] ?? null
    );
  }
};

async function stole(ctx: PlayerContext, plays: Placed[]) {
  const firsts = plays.filter(
    (play) => play.rank === 1 && play.previousFirst !== null && play.previousFirstValue !== null
  );
  if (!firsts.length) return false;
  const priors = await queries.priorBests(
    ctx,
    firsts.map((play) => play.score)
  );
  return firsts.some((play, i) => {
    const prior = priors[i];
    return prior === null || prior < play.previousFirstValue!;
  });
}

async function placed(ctx: PlayerContext): Promise<Placed[]> {
  const best = (await ctx.scores())
    .filter((s) => s.passed && s.isBest)
    .sort((a, b) => b.pp - a.pp)
    .slice(0, CANDIDATES);
  if (!best.length) return [];
  const ranks = await ctx.leaderboardRanks(best);
  return best.map((score, i) => ({ score, ...ranks[i] }));
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
    check: async (ctx) => ((await stole(ctx, await placed(ctx))) ? 1 : 0)
  }),
  board('leaderboard_top10', 'medium', (plays) => some(plays, (p) => p.rank <= 10)),
  board('leaderboard_top50_stars', 'medium', (plays) =>
    some(plays, (p) => p.rank <= 50 && p.score.map.stars >= 5)
  )
];
