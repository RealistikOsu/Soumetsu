import { once, pick, template, type Template } from './types';

const RANKED = '/ranked-play';
const LOBBIES = '/multiplayer';

export const multiplayer: Template[] = [
  template({
    key: 'rp_play',
    family: 'multiplayer',
    tier: 'easy',
    roll: once,
    target: () => 1,
    check: async (ctx) => ((await ctx.rankedPlay()).length >= 1 ? 1 : 0),
    link: () => RANKED
  }),
  template({
    key: 'rp_win',
    family: 'multiplayer',
    tier: 'medium',
    roll: once,
    target: () => 1,
    check: async (ctx) => ((await ctx.rankedPlay()).some((row) => row.won) ? 1 : 0),
    link: () => RANKED
  }),
  template({
    key: 'rp_rounds',
    family: 'multiplayer',
    tier: 'medium',
    roll: (_ctx, _settings, random) => ({ count: pick([3, 5], random) }),
    target: (params) => Number(params.count),
    check: async (ctx) => (await ctx.rankedPlay()).reduce((sum, row) => sum + row.roundsWon, 0),
    link: () => RANKED
  }),
  template({
    key: 'rp_three',
    family: 'multiplayer',
    tier: 'hard',
    roll: once,
    target: () => 3,
    check: async (ctx) => (await ctx.rankedPlay()).length,
    link: () => RANKED
  }),
  template({
    key: 'mp_play',
    family: 'multiplayer',
    tier: 'easy',
    roll: once,
    target: () => 1,
    check: async (ctx) => ((await ctx.multiplayer()).length >= 1 ? 1 : 0),
    link: () => LOBBIES
  }),
  template({
    key: 'mp_win',
    family: 'multiplayer',
    tier: 'medium',
    roll: once,
    target: () => 1,
    check: async (ctx) => ((await ctx.multiplayer()).some((row) => row.won) ? 1 : 0),
    link: () => LOBBIES
  })
];
