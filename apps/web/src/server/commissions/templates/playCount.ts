import type { PlayerContext } from '../context';
import type { DayScore } from '../scores';
import { any, count, once, pick, template, type Template } from './types';

const passed = async (ctx: PlayerContext) => (await ctx.scores()).filter((s) => s.passed);

const distinct = async <T>(ctx: PlayerContext, by: (score: DayScore) => T) =>
  new Set((await passed(ctx)).map(by)).size;

const counted = (key: string, tier: Template['tier'], counts: number[]) =>
  template({
    key,
    family: 'play_count',
    tier,
    roll: (_ctx, _settings, random) => ({ count: pick(counts, random) }),
    target: (params) => Number(params.count),
    check: (ctx) => count(ctx, () => true)
  });

export const playCount: Template[] = [
  counted('play_count', 'easy', [3]),
  counted('play_count_many', 'medium', [5, 10]),
  template({
    key: 'play_maps',
    family: 'play_count',
    tier: 'easy',
    roll: (_ctx, _settings, random) => ({ count: pick([3, 5], random) }),
    target: (params) => Number(params.count),
    check: (ctx) => distinct(ctx, (s) => s.md5)
  }),
  template({
    key: 'play_mode',
    family: 'play_count',
    tier: 'medium',
    roll: (ctx, _settings, random) => ({
      mode: pick(
        [0, 1, 2, 3].filter((mode) => mode !== ctx.favouriteMode),
        random
      ),
      count: pick([2, 3], random)
    }),
    target: (params) => Number(params.count),
    check: (ctx, params) => count(ctx, (s) => s.mode === Number(params.mode))
  }),
  template({
    key: 'play_variant',
    family: 'play_count',
    tier: 'medium',
    roll: (_ctx, _settings, random) => ({
      variant: pick([0, 1, 2], random),
      count: pick([2, 3], random)
    }),
    target: (params) => Number(params.count),
    check: (ctx, params) => count(ctx, (s) => s.variant === Number(params.variant))
  }),
  template({
    key: 'play_source',
    family: 'play_count',
    tier: 'easy',
    roll: (_ctx, settings, random) => ({
      source: settings.lazerTasks ? pick(['stable', 'lazer'], random) : 'stable'
    }),
    target: () => 1,
    check: (ctx, params) => any(ctx, (s) => s.source === params.source),
    lazer: (params) => params.source === 'lazer'
  }),
  template({
    key: 'play_not_favourite',
    family: 'play_count',
    tier: 'easy',
    roll: once,
    target: () => 1,
    check: (ctx) => any(ctx, (s) => s.mode !== ctx.favouriteMode)
  }),
  template({
    key: 'play_all_modes',
    family: 'play_count',
    tier: 'hard',
    roll: once,
    target: () => 4,
    check: (ctx) => distinct(ctx, (s) => s.mode)
  }),
  template({
    key: 'play_two_variants',
    family: 'play_count',
    tier: 'medium',
    roll: once,
    target: () => 2,
    check: (ctx) => distinct(ctx, (s) => s.variant)
  }),
  template({
    key: 'play_both_sources',
    family: 'play_count',
    tier: 'medium',
    roll: once,
    target: () => 2,
    check: (ctx) => distinct(ctx, (s) => s.source),
    lazer: () => true
  })
];
