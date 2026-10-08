import type { PlayerContext } from '../context';
import type { DayScore } from '../scores';
import { any, once, pick, starsAround, template, type Params, type Template } from './types';

type MapInfo = DayScore['map'];

const on = (
  key: string,
  tier: Template['tier'],
  predicate: (map: MapInfo, score: DayScore, params: Params) => boolean,
  roll: Template['roll'] = once
) =>
  template({
    key,
    family: 'map',
    tier,
    roll,
    target: () => 1,
    check: (ctx, params) => any(ctx, (s) => predicate(s.map, s, params))
  });

const stars = (key: string, tier: Template['tier'], offset: number) =>
  on(
    key,
    tier,
    (map, _s, params) => map.stars >= Number(params.stars),
    (ctx) => ({ stars: starsAround(ctx, offset) })
  );

const passedMd5s = async (ctx: PlayerContext) => [
  ...new Set((await ctx.scores()).filter((s) => s.passed).map((s) => s.md5))
];

const distinctMapsInSet = (scores: DayScore[]) => {
  const sets: Record<number, Record<string, true>> = {};
  for (const s of scores) (sets[s.setId] ??= {})[s.md5] = true;
  return Math.max(0, ...Object.values(sets).map((maps) => Object.keys(maps).length));
};

export const mapProperty: Template[] = [
  stars('map_stars', 'medium', 1),
  stars('map_stars_hard', 'hard', 2),
  on('map_easy_nomod', 'easy', (map, s) => map.stars < 3 && s.mods.length === 0),
  on(
    'map_bpm',
    'medium',
    (map, _s, params) => map.bpm >= Number(params.bpm),
    (_ctx, _settings, random) => ({ bpm: pick([200, 250], random) })
  ),
  on(
    'map_long',
    'medium',
    (map, _s, params) => map.length >= Number(params.minutes) * 60,
    (_ctx, _settings, random) => ({ minutes: pick([4, 8], random) })
  ),
  on('map_short', 'easy', (map) => map.length < 60),
  on('map_ar', 'medium', (map) => map.ar >= 9.6),
  on('map_od', 'medium', (map) => map.od >= 9),
  on('map_combo', 'medium', (map) => map.maxCombo >= 1000),
  on('map_diffname', 'easy', (map) => /extra|expert/i.test(map.diffName)),
  on(
    'map_artist',
    'medium',
    (map, _s, params) => map.artist.toLowerCase() === String(params.artist).toLowerCase(),
    (_ctx, settings, random) => {
      const artist = pick(settings.artists, random);
      return artist ? { artist } : null;
    }
  ),
  template({
    key: 'map_famous',
    family: 'map',
    tier: 'medium',
    roll: (_ctx, settings, random) => {
      const map = pick(settings.famousMaps, random);
      return map ? { beatmapId: map.beatmapId, name: map.name } : null;
    },
    target: () => 1,
    check: (ctx, params) => any(ctx, (s) => s.beatmapId === Number(params.beatmapId)),
    link: (params) => `/beatmaps/${params.beatmapId}`
  }),
  on('map_local', 'medium', (map) => map.mapperId > 0),
  on('map_loved', 'easy', (map) => map.ranked === 5),
  template({
    key: 'map_new',
    family: 'map',
    tier: 'easy',
    roll: once,
    target: () => 1,
    check: async (ctx) => {
      const md5s = await passedMd5s(ctx);
      if (!md5s.length) return 0;
      const before = await ctx.playedBefore(md5s);
      return md5s.some((md5) => !before.has(md5)) ? 1 : 0;
    }
  }),
  template({
    key: 'map_revisit',
    family: 'map',
    tier: 'medium',
    roll: once,
    target: () => 1,
    check: async (ctx) => {
      const md5s = await passedMd5s(ctx);
      if (!md5s.length) return 0;
      const cutoff = ctx.window.start.getTime() - 30 * 86_400_000;
      const before = await ctx.playedBefore(md5s);
      return [...before.values()].some((at) => at.getTime() < cutoff) ? 1 : 0;
    }
  }),
  template({
    key: 'map_top_again',
    family: 'map',
    tier: 'medium',
    roll: (ctx) => (ctx.topPp(ctx.favouriteMode, 0) > 0 ? {} : null),
    target: () => 1,
    check: async (ctx) => {
      const md5s = await passedMd5s(ctx);
      if (!md5s.length) return 0;
      const top = new Set(await ctx.topMaps(10));
      return md5s.some((md5) => top.has(md5)) ? 1 : 0;
    }
  }),
  template({
    key: 'map_set_three',
    family: 'map',
    tier: 'medium',
    roll: once,
    target: () => 3,
    check: async (ctx) => distinctMapsInSet((await ctx.scores()).filter((s) => s.passed))
  })
];
