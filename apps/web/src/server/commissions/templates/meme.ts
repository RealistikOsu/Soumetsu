import { any, once, pick, template, type Template } from './types';

export const meme: Template[] = [
  template({
    key: 'meme_combo',
    family: 'meme',
    tier: 'easy',
    roll: (_ctx, _settings, random) => ({ combo: pick([69, 420, 727], random) }),
    target: () => 1,
    check: (ctx, params) => any(ctx, (s) => s.combo === params.combo)
  }),
  template({
    key: 'meme_fail',
    family: 'meme',
    tier: 'easy',
    roll: once,
    target: () => 1,
    check: async (ctx) => ((await ctx.scores()).some((s) => !s.passed) ? 1 : 0)
  })
];
