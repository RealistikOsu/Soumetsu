import { once, pick, template, type Template } from './types';

const inOrder = async (ctx: Parameters<Template['check']>[0]) =>
  [...(await ctx.scores())].sort((a, b) => a.at.getTime() - b.at.getTime());

export const session: Template[] = [
  template({
    key: 'session_streak',
    family: 'session',
    tier: 'medium',
    roll: (_ctx, _settings, random) => ({ count: pick([3, 5], random) }),
    target: (params) => Number(params.count),
    // Only different maps add to the run, so passing one short map over and over doesn't count. A repeat pass
    // neither adds nor breaks it; a fail does.
    check: async (ctx) => {
      let longest = 0;
      let run: string[] = [];
      for (const s of await inOrder(ctx)) {
        if (!s.passed) run = [];
        else if (!run.includes(s.md5)) run.push(s.md5);
        longest = Math.max(longest, run.length);
      }
      return longest;
    }
  }),
  template({
    key: 'session_retry',
    family: 'session',
    tier: 'easy',
    roll: once,
    target: () => 1,
    check: async (ctx) => {
      const failed: Record<string, true> = {};
      for (const s of await inOrder(ctx)) {
        if (!s.passed) failed[s.md5] = true;
        else if (failed[s.md5]) return 1;
      }
      return 0;
    }
  }),
  template({
    key: 'session_minutes',
    family: 'session',
    tier: 'medium',
    roll: (_ctx, _settings, random) => ({ minutes: pick([20, 45], random) }),
    target: (params) => Number(params.minutes),
    check: async (ctx) => {
      const seconds = (await ctx.scores())
        .filter((s) => s.passed)
        .reduce((sum, s) => sum + s.map.length / s.rate, 0);
      return Math.floor(seconds / 60);
    }
  }),
  template({
    key: 'session_climb',
    family: 'session',
    tier: 'medium',
    roll: once,
    target: () => 1,
    check: async (ctx) => {
      const plays = (await inOrder(ctx)).filter((s) => s.passed);
      for (let i = 2; i < plays.length; i++) {
        if (
          plays[i - 2].map.stars < plays[i - 1].map.stars &&
          plays[i - 1].map.stars < plays[i].map.stars
        )
          return 1;
      }
      return 0;
    }
  })
];
