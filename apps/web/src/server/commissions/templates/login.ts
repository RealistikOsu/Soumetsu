import { once, template, type Template } from './types';

export const login: Template[] = [
  template({
    key: 'login',
    family: 'login',
    tier: 'easy',
    roll: once,
    target: () => 1,
    // latest_activity is a single timestamp, so it can only prove activity inside the window it falls in;
    // re-checking a past day must not count today's visit.
    check: async (ctx) =>
      ctx.latestActivity >= Number(ctx.window.startUnix) &&
      ctx.latestActivity < Number(ctx.window.endUnix)
        ? 1
        : 0
  })
];
