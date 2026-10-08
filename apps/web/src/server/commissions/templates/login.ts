import { once, template, type Template } from './types';

export const login: Template[] = [
  template({
    key: 'login',
    family: 'login',
    tier: 'easy',
    roll: once,
    target: () => 1,
    check: async (ctx) => (ctx.latestActivity >= Number(ctx.window.startUnix) ? 1 : 0)
  })
];
