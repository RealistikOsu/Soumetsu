import type { PlayerContext } from '../context';
import type { DayScore } from '../scores';
import { once, template, type Template } from './types';

// Placements only settle when the day finalises at the UTC rollover.
async function placed(ctx: PlayerContext, atLeast: number) {
  const row = await ctx.daily();
  if (!row?.finalised) return 0;
  return row.placement >= atLeast || row.stablePlacement >= atLeast ? 1 : 0;
}

async function onDaily(ctx: PlayerContext, predicate: (score: DayScore) => boolean) {
  const row = await ctx.daily();
  if (!row) return 0;
  const scores = await ctx.scores();
  return scores.some((s) => s.passed && s.beatmapId === row.beatmapId && predicate(s)) ? 1 : 0;
}

const daily = (key: string, tier: Template['tier'], check: Template['check']) =>
  template({
    key,
    family: 'daily',
    tier,
    roll: once,
    target: () => 1,
    check,
    link: () => '/daily-challenge'
  });

export const dailyChallenge: Template[] = [
  daily('daily_play', 'easy', async (ctx) => {
    const row = await ctx.daily();
    return row && (row.bestScore > 0 || row.stableScore > 0) ? 1 : 0;
  }),
  daily('daily_top50', 'medium', (ctx) => placed(ctx, 1)),
  daily('daily_top10', 'hard', (ctx) => placed(ctx, 2)),
  daily('daily_s', 'medium', (ctx) => onDaily(ctx, (s) => s.grade.startsWith('S'))),
  daily('daily_both', 'hard', async (ctx) => {
    const row = await ctx.daily();
    return row && row.bestScore > 0 && row.stableScore > 0 ? 1 : 0;
  }),
  daily('daily_beat', 'medium', async (ctx) => {
    const row = await ctx.daily();
    if (!row) return 0;
    // Stable and lazer scores are on different scales, so only compare like with like.
    const plays = (await ctx.scores())
      .filter((s) => s.passed && s.beatmapId === row.beatmapId)
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    return plays.some((play, i) =>
      plays
        .slice(0, i)
        .some(
          (earlier) =>
            earlier.source === play.source &&
            earlier.variant === play.variant &&
            play.score > earlier.score
        )
    )
      ? 1
      : 0;
  }),
  daily('daily_no_miss', 'medium', (ctx) => onDaily(ctx, (s) => s.misses === 0))
];
