import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import type { PlayerContext } from '../context';
import { isRankedStatus, RANKED_STATUSES, targetPp, type PpBasis } from '../ppBasis';
import { optional, type DayScore } from '../scores';
import { any, count, once, pick, template, type Params, type Template } from './types';

const TABLES = ['scores', 'scores_relax', 'scores_ap'];
const A_OR_BETTER = ['A', 'S', 'SH', 'SS', 'SSH'];
const CANDIDATES = 20;

// Separate from the checks so tests can stand in for the database.
export const queries = {
  // Each play's best pp on the same map before the day started, in the order given.
  async previousBests(ctx: PlayerContext, plays: DayScore[]): Promise<(number | null)[]> {
    const found: Record<string, number> = {};
    const keyOf = (source: string, variant: number, md5: string, mode: number) =>
      `${source}:${variant}:${md5}:${mode}`;
    const md5sOf = (list: DayScore[]) => [...new Set(list.map((play) => play.md5))];

    await Promise.all([
      ...TABLES.map(async (table, variant) => {
        const md5s = md5sOf(
          plays.filter((play) => play.source === 'stable' && play.variant === variant)
        );
        if (!md5s.length) return;
        const rows = await db.$queryRaw<{ beatmap_md5: string; mode: number; pp: number }[]>(
          Prisma.sql`
            SELECT beatmap_md5, play_mode AS mode, MAX(pp) AS pp FROM ${Prisma.raw(table)}
            WHERE userid = ${ctx.id} AND beatmap_md5 IN (${Prisma.join(md5s)}) AND completed >= 1
              AND time < ${ctx.window.startUnix}
            GROUP BY beatmap_md5, play_mode`
        );
        for (const row of rows)
          found[keyOf('stable', variant, row.beatmap_md5, Number(row.mode))] = Number(row.pp);
      }),
      (async () => {
        const md5s = md5sOf(plays.filter((play) => play.source === 'lazer'));
        if (!md5s.length) return;
        const rows = await optional(db.$queryRaw<
          { beatmap_md5: string; mode: number; variant: number; pp: number }[]
        >`
          SELECT beatmap_md5, ruleset_id AS mode, variant, MAX(pp) AS pp FROM lazer_scores
          WHERE user_id = ${ctx.id} AND beatmap_md5 IN (${Prisma.join(md5s)})
            AND passed = 1 AND ranked_mods = 1 AND ended_at < ${ctx.window.start}
          GROUP BY beatmap_md5, ruleset_id, variant`);
        for (const row of rows)
          found[keyOf('lazer', Number(row.variant), row.beatmap_md5, Number(row.mode))] = Number(
            row.pp
          );
      })()
    ]);

    return plays.map(
      (play) => found[keyOf(play.source, play.variant, play.md5, play.mode)] ?? null
    );
  },

  async nthBest(
    ctx: PlayerContext,
    source: DayScore['source'],
    mode: number,
    variant: number,
    n: number,
    rankedOnly = true
  ): Promise<number> {
    const ranked = rankedOnly
      ? Prisma.sql`INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5 AND b.ranked IN (${Prisma.join(RANKED_STATUSES)})`
      : Prisma.empty;
    if (source === 'stable') {
      const [row] = await db.$queryRaw<{ pp: number }[]>(Prisma.sql`
        SELECT s.pp FROM ${Prisma.raw(TABLES[variant])} s ${ranked}
        WHERE s.userid = ${ctx.id} AND s.play_mode = ${mode} AND s.completed = 3
        ORDER BY s.pp DESC LIMIT 1 OFFSET ${n - 1}`);
      return Number(row?.pp ?? 0);
    }
    // Lazer keeps every play, so only the best one per map counts towards the ranking.
    const [row] = await optional(db.$queryRaw<{ pp: number }[]>`
      SELECT pp FROM (
        SELECT s.pp, ROW_NUMBER() OVER (PARTITION BY s.beatmap_md5 ORDER BY s.pp DESC) AS rn FROM lazer_scores s ${ranked}
        WHERE s.user_id = ${ctx.id} AND s.ruleset_id = ${mode} AND s.variant = ${variant}
          AND s.passed = 1 AND s.ranked_mods = 1
      ) best WHERE rn = 1 ORDER BY pp DESC LIMIT 1 OFFSET ${n - 1}`);
    return Number(row?.pp ?? 0);
  }
};

const bests = async (ctx: PlayerContext) =>
  (await ctx.scores())
    .filter((s) => s.passed && s.isBest)
    .sort((a, b) => b.pp - a.pp)
    .slice(0, CANDIDATES);

const simple = (
  key: string,
  tier: Template['tier'],
  predicate: (s: DayScore, params: Params) => boolean,
  roll: Template['roll'] = once
) =>
  template({
    key,
    family: 'quality',
    tier,
    roll,
    target: () => 1,
    check: (ctx, params) => any(ctx, (s) => predicate(s, params))
  });

const bucketOf = (basis: PpBasis) => ({
  source: basis.source,
  mode: basis.mode,
  variant: basis.variant
});

// Tasks rolled before pp tasks had a source accept either client and any map status.
const inBucket = (s: DayScore, params: Params) =>
  params.source === undefined
    ? s.mode === Number(params.mode) && s.variant === Number(params.variant)
    : s.source === params.source &&
      s.mode === Number(params.mode) &&
      s.variant === Number(params.variant) &&
      isRankedStatus(s.map.ranked);

// Aims at the pp of the player's nth best play in the bucket they've been playing.
const ppTask = (key: string, tier: Template['tier'], n: number) =>
  simple(
    key,
    tier,
    (s, params) => inBucket(s, params) && s.pp >= Number(params.pp),
    (ctx) => {
      const pp = ctx.ppBasis && targetPp(ctx.ppBasis, n);
      return pp ? { ...bucketOf(ctx.ppBasis!), pp } : null;
    }
  );

const rankTask = (key: string, tier: Template['tier'], n: number) =>
  template({
    key,
    family: 'quality',
    tier,
    roll: (ctx) => (ctx.ppBasis ? bucketOf(ctx.ppBasis) : null),
    target: () => 1,
    check: async (ctx, params) => {
      const legacy = params.source === undefined;
      const plays = (await bests(ctx)).filter((s) => inBucket(s, params));
      for (const source of ['stable', 'lazer'] as const) {
        const ofSource = plays.filter((s) => s.source === source);
        if (!ofSource.length) continue;
        const threshold = await queries.nthBest(
          ctx,
          source,
          Number(params.mode),
          Number(params.variant),
          n,
          !legacy
        );
        if (ofSource.some((s) => s.pp > 0 && s.pp >= threshold)) return 1;
      }
      return 0;
    }
  });

export const quality: Template[] = [
  simple('quality_a', 'easy', (s) => A_OR_BETTER.includes(s.grade)),
  simple('quality_s', 'medium', (s) => s.grade.startsWith('S')),
  simple('quality_ss', 'hard', (s) => s.grade.startsWith('SS')),
  template({
    key: 'quality_three_s',
    family: 'quality',
    tier: 'hard',
    roll: once,
    target: () => 3,
    check: (ctx) => count(ctx, (s) => s.grade.startsWith('S'))
  }),
  simple('quality_ss_stars', 'hard', (s) => s.grade.startsWith('SS') && s.map.stars >= 3),
  simple('quality_fc', 'medium', (s) => s.misses === 0),
  simple('quality_fc_stars', 'hard', (s) => s.misses === 0 && s.map.stars >= 4),
  simple('quality_acc', 'medium', (s) => s.accuracy >= 98),
  simple('quality_acc_stars', 'hard', (s) => s.accuracy >= 95 && s.map.stars >= 5),
  simple(
    'quality_misses',
    'easy',
    (s, params) => s.misses <= Number(params.misses),
    (_ctx, _settings, random) => ({ misses: pick([3, 1], random) })
  ),
  simple('quality_choke', 'easy', (s) => s.misses === 1),
  simple(
    'quality_combo',
    'medium',
    (s, params) => s.combo >= Number(params.combo),
    (_ctx, _settings, random) => ({ combo: pick([500, 1000], random) })
  ),
  simple('quality_300s', 'hard', (s) => s.c300 >= 2000),
  ppTask('quality_pp', 'medium', 25),
  ppTask('quality_pp_hard', 'hard', 10),
  template({
    key: 'quality_pb_gain',
    family: 'quality',
    tier: 'hard',
    roll: once,
    target: () => 1,
    check: async (ctx) => {
      const all = await ctx.scores();
      const plays = await bests(ctx);
      if (!plays.length) return 0;
      const previous = await queries.previousBests(ctx, plays);
      for (const [i, play] of plays.entries()) {
        const earlier = all
          .filter(
            (s) =>
              s.passed &&
              s.md5 === play.md5 &&
              s.variant === play.variant &&
              s.mode === play.mode &&
              s.at < play.at
          )
          .map((s) => s.pp);
        const before = previous[i];
        if (before !== null) earlier.push(before);
        if (earlier.length && play.pp >= Math.max(...earlier) + 10) return 1;
      }
      return 0;
    }
  }),
  template({
    key: 'quality_total_pp',
    family: 'quality',
    tier: 'medium',
    roll: (ctx) => {
      const pp = ctx.ppBasis && targetPp(ctx.ppBasis, 25, 3);
      return pp ? { ...bucketOf(ctx.ppBasis!), pp } : null;
    },
    target: (params) => Number(params.pp),
    check: async (ctx, params) =>
      Math.floor(
        (await ctx.scores())
          .filter(
            (s) => s.passed && s.isBest && (params.source === undefined || inBucket(s, params))
          )
          .reduce((sum, s) => sum + s.pp, 0)
      )
  }),
  rankTask('quality_top50', 'medium', 50),
  rankTask('quality_top10', 'hard', 10)
];
