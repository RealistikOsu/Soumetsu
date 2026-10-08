import { afterEach, describe, expect, test } from 'bun:test';
import { fakeContext, type DailyRow, type PlayerContext } from '../context';
import type { DayScore } from '../scores';
import { DEFAULT_SETTINGS } from '../settings';
import { byKey } from './index';
import { queries } from './quality';

const score = (overrides: Partial<DayScore> = {}): DayScore => ({
  id: 1,
  source: 'stable',
  variant: 0,
  mode: 0,
  beatmapId: 5,
  setId: 10,
  md5: 'abc',
  score: 1000000,
  pp: 100,
  accuracy: 97,
  combo: 500,
  misses: 1,
  c300: 400,
  c100: 20,
  c50: 0,
  mods: [],
  rate: 1,
  passed: true,
  grade: 'A',
  rankedMods: true,
  isBest: true,
  at: new Date('2026-10-08T10:00:00Z'),
  map: {
    stars: 5,
    bpm: 180,
    length: 200,
    ar: 9,
    od: 8,
    maxCombo: 600,
    diffName: 'Insane',
    songName: 'A - B [Insane]',
    artist: 'A',
    ranked: 2,
    mapperId: -1,
    mode: 0,
    latestUpdate: 0
  },
  ...overrides
});

const withMap = (map: Partial<DayScore['map']>, overrides: Partial<DayScore> = {}) =>
  score({ map: { ...score().map, ...map }, ...overrides });

const ctxWith = (scores: DayScore[], overrides: Partial<PlayerContext> = {}) =>
  fakeContext({ scores: async () => scores, ...overrides });

const run = (
  key: string,
  ctx: PlayerContext,
  params: Record<string, string | number | boolean> = {}
) => byKey.get(key)!.check(ctx, params);

const dailyRow = (overrides: Partial<DailyRow> = {}): DailyRow => ({
  beatmapId: 5,
  bestScore: 0,
  stableScore: 0,
  placement: 0,
  stablePlacement: 0,
  finalised: false,
  ...overrides
});
const dailyCtx = (row: DailyRow | null, scores: DayScore[] = []) =>
  ctxWith(scores, { daily: async () => row });

describe('login', () => {
  test('activity since the day started', async () => {
    const start = Number(fakeContext({}).window.startUnix);
    expect(await run('login', fakeContext({ latestActivity: start + 5 }))).toBe(1);
    expect(await run('login', fakeContext({ latestActivity: start - 5 }))).toBe(0);
  });
});

describe('daily', () => {
  test('daily_play', async () => {
    expect(await run('daily_play', dailyCtx(dailyRow({ stableScore: 5 })))).toBe(1);
    expect(await run('daily_play', dailyCtx(dailyRow()))).toBe(0);
    expect(await run('daily_play', dailyCtx(null))).toBe(0);
  });
  test('daily_top50 waits for finalisation', async () => {
    expect(await run('daily_top50', dailyCtx(dailyRow({ placement: 1, finalised: true })))).toBe(1);
    expect(await run('daily_top50', dailyCtx(dailyRow({ placement: 1 })))).toBe(0);
    expect(await run('daily_top50', dailyCtx(dailyRow({ finalised: true })))).toBe(0);
  });
  test('daily_top10', async () => {
    expect(
      await run('daily_top10', dailyCtx(dailyRow({ stablePlacement: 2, finalised: true })))
    ).toBe(1);
    expect(await run('daily_top10', dailyCtx(dailyRow({ placement: 1, finalised: true })))).toBe(0);
  });
  test('daily_s', async () => {
    expect(await run('daily_s', dailyCtx(dailyRow(), [score({ grade: 'SH' })]))).toBe(1);
    expect(await run('daily_s', dailyCtx(dailyRow(), [score({ grade: 'A' })]))).toBe(0);
    expect(await run('daily_s', dailyCtx(dailyRow(), [score({ grade: 'S', beatmapId: 9 })]))).toBe(
      0
    );
  });
  test('daily_both', async () => {
    expect(await run('daily_both', dailyCtx(dailyRow({ bestScore: 1, stableScore: 1 })))).toBe(1);
    expect(await run('daily_both', dailyCtx(dailyRow({ bestScore: 1 })))).toBe(0);
  });
  test('daily_beat needs a later higher score', async () => {
    const plays = [score({ id: 1, score: 100 }), score({ id: 2, score: 200 })];
    expect(await run('daily_beat', dailyCtx(dailyRow(), plays))).toBe(1);
    expect(await run('daily_beat', dailyCtx(dailyRow(), plays.reverse()))).toBe(0);
  });
  test('daily_no_miss', async () => {
    expect(await run('daily_no_miss', dailyCtx(dailyRow(), [score({ misses: 0 })]))).toBe(1);
    expect(await run('daily_no_miss', dailyCtx(dailyRow(), [score({ misses: 1 })]))).toBe(0);
  });
});

describe('play_count', () => {
  test('play_count counts passed scores only', async () => {
    const plays = [score(), score({ id: 2, passed: false })];
    expect(await run('play_count', ctxWith(plays), { count: 3 })).toBe(1);
    expect(await run('play_count', ctxWith([]), { count: 3 })).toBe(0);
  });
  test('play_count_many', async () => {
    const plays = [score(), score({ id: 2 }), score({ id: 3 })];
    expect(await run('play_count_many', ctxWith(plays), { count: 5 })).toBe(3);
    expect(await run('play_count_many', ctxWith([score({ passed: false })]), { count: 5 })).toBe(0);
  });
  test('play_maps counts distinct maps', async () => {
    const plays = [score(), score({ id: 2 }), score({ id: 3, md5: 'def' })];
    expect(await run('play_maps', ctxWith(plays), { count: 3 })).toBe(2);
    expect(
      await run('play_maps', ctxWith([score({ md5: 'x', passed: false })]), { count: 3 })
    ).toBe(0);
  });
  test('play_mode counts the asked mode', async () => {
    const plays = [score({ mode: 1 }), score({ id: 2 })];
    expect(await run('play_mode', ctxWith(plays), { mode: 1, count: 2 })).toBe(1);
    expect(await run('play_mode', ctxWith(plays), { mode: 3, count: 2 })).toBe(0);
  });
  test('play_mode never rolls the favourite mode', () => {
    const t = byKey.get('play_mode')!;
    const ctx = fakeContext({ favouriteMode: 2 });
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(t.roll(ctx, DEFAULT_SETTINGS, () => r)!.mode).not.toBe(2);
    }
  });
  test('play_variant', async () => {
    const plays = [score({ variant: 1 }), score({ id: 2, variant: 1 })];
    expect(await run('play_variant', ctxWith(plays), { variant: 1, count: 2 })).toBe(2);
    expect(await run('play_variant', ctxWith(plays), { variant: 2, count: 2 })).toBe(0);
  });
  test('play_source', async () => {
    expect(
      await run('play_source', ctxWith([score({ source: 'lazer' })]), { source: 'lazer' })
    ).toBe(1);
    expect(await run('play_source', ctxWith([score()]), { source: 'lazer' })).toBe(0);
  });
  test('play_not_favourite', async () => {
    expect(await run('play_not_favourite', ctxWith([score({ mode: 3 })]))).toBe(1);
    expect(await run('play_not_favourite', ctxWith([score()]))).toBe(0);
  });
  test('play_all_modes', async () => {
    const plays = [0, 1, 2].map((mode) => score({ id: mode, mode: mode as 0 | 1 | 2 }));
    expect(await run('play_all_modes', ctxWith(plays))).toBe(3);
    expect(await run('play_all_modes', ctxWith([score({ mode: 3, passed: false })]))).toBe(0);
  });
  test('play_two_variants', async () => {
    expect(await run('play_two_variants', ctxWith([score(), score({ id: 2, variant: 1 })]))).toBe(
      2
    );
    expect(await run('play_two_variants', ctxWith([score(), score({ id: 2 })]))).toBe(1);
  });
  test('play_both_sources', async () => {
    expect(
      await run('play_both_sources', ctxWith([score(), score({ id: 2, source: 'lazer' })]))
    ).toBe(2);
    expect(await run('play_both_sources', ctxWith([score()]))).toBe(1);
  });
});

describe('map', () => {
  test('map_stars', async () => {
    expect(await run('map_stars', ctxWith([withMap({ stars: 6.2 })]), { stars: 6 })).toBe(1);
    expect(await run('map_stars', ctxWith([score()]), { stars: 6 })).toBe(0);
  });
  test('map_stars_hard', async () => {
    expect(await run('map_stars_hard', ctxWith([withMap({ stars: 7 })]), { stars: 7 })).toBe(1);
    expect(
      await run('map_stars_hard', ctxWith([withMap({ stars: 7 }, { passed: false })]), { stars: 7 })
    ).toBe(0);
  });
  test('map_stars rolls around the usual stars', () => {
    const ctx = fakeContext({ usualStars: 4 });
    expect(byKey.get('map_stars')!.roll(ctx, DEFAULT_SETTINGS, Math.random)).toEqual({ stars: 5 });
    expect(byKey.get('map_stars_hard')!.roll(ctx, DEFAULT_SETTINGS, Math.random)).toEqual({
      stars: 6
    });
  });
  test('map_easy_nomod', async () => {
    expect(await run('map_easy_nomod', ctxWith([withMap({ stars: 2 })]))).toBe(1);
    expect(await run('map_easy_nomod', ctxWith([withMap({ stars: 2 }, { mods: ['HD'] })]))).toBe(0);
  });
  test('map_bpm', async () => {
    expect(await run('map_bpm', ctxWith([withMap({ bpm: 210 })]), { bpm: 200 })).toBe(1);
    expect(await run('map_bpm', ctxWith([score()]), { bpm: 200 })).toBe(0);
  });
  test('map_long', async () => {
    expect(await run('map_long', ctxWith([withMap({ length: 250 })]), { minutes: 4 })).toBe(1);
    expect(await run('map_long', ctxWith([withMap({ length: 230 })]), { minutes: 4 })).toBe(0);
  });
  test('map_short', async () => {
    expect(await run('map_short', ctxWith([withMap({ length: 45 })]))).toBe(1);
    expect(await run('map_short', ctxWith([score()]))).toBe(0);
  });
  test('map_ar', async () => {
    expect(await run('map_ar', ctxWith([withMap({ ar: 9.7 })]))).toBe(1);
    expect(await run('map_ar', ctxWith([withMap({ ar: 9.5 })]))).toBe(0);
  });
  test('map_od', async () => {
    expect(await run('map_od', ctxWith([withMap({ od: 9 })]))).toBe(1);
    expect(await run('map_od', ctxWith([score()]))).toBe(0);
  });
  test('map_combo', async () => {
    expect(await run('map_combo', ctxWith([withMap({ maxCombo: 1200 })]))).toBe(1);
    expect(await run('map_combo', ctxWith([score()]))).toBe(0);
  });
  test('map_diffname', async () => {
    expect(await run('map_diffname', ctxWith([withMap({ diffName: "Sky's EXTRA" })]))).toBe(1);
    expect(await run('map_diffname', ctxWith([score()]))).toBe(0);
  });
  test('map_artist ignores case and rolls null without artists', async () => {
    expect(
      await run('map_artist', ctxWith([withMap({ artist: 'camellia' })]), { artist: 'Camellia' })
    ).toBe(1);
    expect(await run('map_artist', ctxWith([score()]), { artist: 'Camellia' })).toBe(0);
    const t = byKey.get('map_artist')!;
    expect(t.roll(fakeContext({}), { ...DEFAULT_SETTINGS, artists: [] }, Math.random)).toBeNull();
    expect(t.roll(fakeContext({}), { ...DEFAULT_SETTINGS, artists: ['xi'] }, Math.random)).toEqual({
      artist: 'xi'
    });
  });
  test('map_famous', async () => {
    expect(
      await run('map_famous', ctxWith([score({ beatmapId: 129891 })]), { beatmapId: 129891 })
    ).toBe(1);
    expect(await run('map_famous', ctxWith([score()]), { beatmapId: 129891 })).toBe(0);
    const t = byKey.get('map_famous')!;
    expect(t.link!({ beatmapId: 129891 })).toBe('/beatmaps/129891');
    expect(
      t.roll(fakeContext({}), { ...DEFAULT_SETTINGS, famousMaps: [] }, Math.random)
    ).toBeNull();
  });
  test('map_local', async () => {
    expect(await run('map_local', ctxWith([withMap({ mapperId: 1000 })]))).toBe(1);
    expect(await run('map_local', ctxWith([score()]))).toBe(0);
  });
  test('map_loved', async () => {
    expect(await run('map_loved', ctxWith([withMap({ ranked: 5 })]))).toBe(1);
    expect(await run('map_loved', ctxWith([score()]))).toBe(0);
  });
  test('map_new', async () => {
    const seen = new Map([['abc', new Date('2026-01-01')]]);
    expect(await run('map_new', ctxWith([score()]))).toBe(1);
    expect(await run('map_new', ctxWith([score()], { playedBefore: async () => seen }))).toBe(0);
    expect(await run('map_new', ctxWith([]))).toBe(0);
  });
  test('map_revisit needs a play older than 30 days', async () => {
    const old = new Map([['abc', new Date('2026-08-01')]]);
    const recent = new Map([['abc', new Date('2026-10-01')]]);
    expect(await run('map_revisit', ctxWith([score()], { playedBefore: async () => old }))).toBe(1);
    expect(await run('map_revisit', ctxWith([score()], { playedBefore: async () => recent }))).toBe(
      0
    );
  });
  test('map_top_again', async () => {
    expect(await run('map_top_again', ctxWith([score()], { topMaps: async () => ['abc'] }))).toBe(
      1
    );
    expect(await run('map_top_again', ctxWith([score()], { topMaps: async () => ['zzz'] }))).toBe(
      0
    );
    const t = byKey.get('map_top_again')!;
    expect(t.roll(fakeContext({}), DEFAULT_SETTINGS, Math.random)).toBeNull();
    expect(
      t.roll(
        fakeContext({ bestTopPp: () => ({ mode: 0, variant: 0, pp: 300 }) }),
        DEFAULT_SETTINGS,
        Math.random
      )
    ).toEqual({});
  });
  test('map_set_three counts distinct difficulties in one set', async () => {
    const same = [score({ md5: 'a' }), score({ id: 2, md5: 'b' }), score({ id: 3, md5: 'c' })];
    expect(await run('map_set_three', ctxWith(same))).toBe(3);
    const split = [
      score({ md5: 'a' }),
      score({ id: 2, md5: 'a' }),
      score({ id: 3, md5: 'c', setId: 11 })
    ];
    expect(await run('map_set_three', ctxWith(split))).toBe(1);
    expect(await run('map_set_three', ctxWith([]))).toBe(0);
  });
});

describe('session', () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 8, 10, minute));
  test('session_streak is the longest run of passes in time order', async () => {
    const plays = [
      score({ id: 1, at: at(1) }),
      score({ id: 2, passed: false, at: at(2) }),
      score({ id: 3, at: at(3) }),
      score({ id: 4, at: at(4) }),
      score({ id: 5, at: at(5) })
    ];
    expect(await run('session_streak', ctxWith(plays), { count: 3 })).toBe(3);
    expect(await run('session_streak', ctxWith(plays.slice(0, 2)), { count: 3 })).toBe(1);
    expect(await run('session_streak', ctxWith([]), { count: 3 })).toBe(0);
  });
  test('session_retry needs a fail then a pass on the same map', async () => {
    const retry = [score({ id: 1, passed: false, at: at(1) }), score({ id: 2, at: at(2) })];
    expect(await run('session_retry', ctxWith(retry))).toBe(1);
    const wrongOrder = [score({ id: 1, at: at(1) }), score({ id: 2, passed: false, at: at(2) })];
    expect(await run('session_retry', ctxWith(wrongOrder))).toBe(0);
    const otherMap = [
      score({ id: 1, passed: false, at: at(1) }),
      score({ id: 2, md5: 'x', at: at(2) })
    ];
    expect(await run('session_retry', ctxWith(otherMap))).toBe(0);
  });
  test('session_minutes adjusts for rate and skips fails', async () => {
    const plays = [
      withMap({ length: 600 }, { rate: 1.5 }),
      withMap({ length: 600 }, { id: 2, passed: false })
    ];
    expect(await run('session_minutes', ctxWith(plays), { minutes: 20 })).toBe(6);
    expect(await run('session_minutes', ctxWith([]), { minutes: 20 })).toBe(0);
  });
  test('session_climb needs three rising star ratings in a row', async () => {
    const rising = [1, 2, 3].map((n) => withMap({ stars: n }, { id: n, at: at(n) }));
    expect(await run('session_climb', ctxWith(rising))).toBe(1);
    const flat = [1, 3, 2].map((n, i) => withMap({ stars: n }, { id: i, at: at(i) }));
    expect(await run('session_climb', ctxWith(flat))).toBe(0);
  });
});

describe('quality', () => {
  const grades = (key: string, good: DayScore['grade'][], bad: DayScore['grade'][]) =>
    test(`${key} by grade`, async () => {
      for (const grade of good) expect(await run(key, ctxWith([score({ grade })]))).toBe(1);
      for (const grade of bad) expect(await run(key, ctxWith([score({ grade })]))).toBe(0);
      expect(await run(key, ctxWith([score({ grade: 'SS', passed: false })]))).toBe(0);
    });
  grades('quality_a', ['A', 'S', 'SH', 'SS', 'SSH'], ['B', 'C']);
  grades('quality_s', ['S', 'SH', 'SS', 'SSH'], ['A']);
  grades('quality_ss', ['SS', 'SSH'], ['S', 'SH']);

  test('quality_three_s', async () => {
    const plays = [
      score({ grade: 'S' }),
      score({ id: 2, grade: 'SS' }),
      score({ id: 3, grade: 'SH' })
    ];
    expect(await run('quality_three_s', ctxWith(plays))).toBe(3);
    expect(await run('quality_three_s', ctxWith([score()]))).toBe(0);
  });
  test('quality_ss_stars', async () => {
    expect(await run('quality_ss_stars', ctxWith([withMap({ stars: 3 }, { grade: 'SS' })]))).toBe(
      1
    );
    expect(await run('quality_ss_stars', ctxWith([withMap({ stars: 2 }, { grade: 'SS' })]))).toBe(
      0
    );
  });
  test('quality_fc needs zero misses on a pass', async () => {
    expect(await run('quality_fc', ctxWith([score({ misses: 0 })]))).toBe(1);
    expect(await run('quality_fc', ctxWith([score({ misses: 0, passed: false })]))).toBe(0);
  });
  test('quality_fc_stars', async () => {
    expect(await run('quality_fc_stars', ctxWith([withMap({ stars: 4 }, { misses: 0 })]))).toBe(1);
    expect(await run('quality_fc_stars', ctxWith([withMap({ stars: 3.9 }, { misses: 0 })]))).toBe(
      0
    );
  });
  test('quality_acc', async () => {
    expect(await run('quality_acc', ctxWith([score({ accuracy: 98 })]))).toBe(1);
    expect(await run('quality_acc', ctxWith([score({ accuracy: 97.9 })]))).toBe(0);
  });
  test('quality_acc_stars', async () => {
    expect(await run('quality_acc_stars', ctxWith([score({ accuracy: 95 })]))).toBe(1);
    expect(await run('quality_acc_stars', ctxWith([withMap({ stars: 4 }, { accuracy: 99 })]))).toBe(
      0
    );
  });
  test('quality_misses', async () => {
    expect(await run('quality_misses', ctxWith([score({ misses: 3 })]), { misses: 3 })).toBe(1);
    expect(await run('quality_misses', ctxWith([score({ misses: 3 })]), { misses: 1 })).toBe(0);
  });
  test('quality_choke', async () => {
    expect(await run('quality_choke', ctxWith([score({ misses: 1 })]))).toBe(1);
    expect(await run('quality_choke', ctxWith([score({ misses: 0 })]))).toBe(0);
  });
  test('quality_combo', async () => {
    expect(await run('quality_combo', ctxWith([score({ combo: 500 })]), { combo: 500 })).toBe(1);
    expect(await run('quality_combo', ctxWith([score({ combo: 499 })]), { combo: 500 })).toBe(0);
  });
  test('quality_300s', async () => {
    expect(await run('quality_300s', ctxWith([score({ c300: 2000 })]))).toBe(1);
    expect(await run('quality_300s', ctxWith([score()]))).toBe(0);
  });
  test('quality_pp and quality_pp_hard', async () => {
    const params = { pp: 90, mode: 0, variant: 0 };
    expect(await run('quality_pp', ctxWith([score({ pp: 90 })]), params)).toBe(1);
    expect(await run('quality_pp', ctxWith([score({ pp: 89 })]), params)).toBe(0);
    expect(await run('quality_pp_hard', ctxWith([score({ pp: 90, variant: 1 })]), params)).toBe(0);
    expect(await run('quality_pp_hard', ctxWith([score({ pp: 95 })]), params)).toBe(1);
  });
  test('quality_pp rolls from the best top play', () => {
    const ctx = fakeContext({ bestTopPp: () => ({ mode: 1, variant: 2, pp: 200 }) });
    expect(byKey.get('quality_pp')!.roll(ctx, DEFAULT_SETTINGS, Math.random)).toEqual({
      mode: 1,
      variant: 2,
      pp: 140
    });
    expect(
      byKey.get('quality_pp')!.roll(fakeContext({}), DEFAULT_SETTINGS, Math.random)
    ).toBeNull();
  });
  test('quality_total_pp sums best plays', async () => {
    const plays = [
      score({ pp: 40 }),
      score({ id: 2, pp: 30.5 }),
      score({ id: 3, pp: 90, isBest: false })
    ];
    expect(await run('quality_total_pp', ctxWith(plays), { pp: 100 })).toBe(70);
    expect(await run('quality_total_pp', ctxWith([]), { pp: 100 })).toBe(0);
    expect(byKey.get('quality_total_pp')!.target({ pp: 100 })).toBe(100);
  });

  describe('against stored plays', () => {
    const real = { ...queries };
    afterEach(() => Object.assign(queries, real));

    test('quality_pb_gain compares with the earlier best', async () => {
      queries.previousBest = async () => 100;
      expect(await run('quality_pb_gain', ctxWith([score({ pp: 110 })]))).toBe(1);
      expect(await run('quality_pb_gain', ctxWith([score({ pp: 109 })]))).toBe(0);
    });
    test('quality_pb_gain counts earlier plays today and skips new maps', async () => {
      queries.previousBest = async () => null;
      const improved = [
        score({ id: 1, pp: 50 }),
        score({ id: 2, pp: 70, at: new Date('2026-10-08T11:00:00Z') })
      ];
      expect(await run('quality_pb_gain', ctxWith(improved))).toBe(1);
      expect(await run('quality_pb_gain', ctxWith([score({ pp: 500 })]))).toBe(0);
    });
    test('quality_top50 passes at or above the threshold', async () => {
      queries.nthBest = async () => 100;
      const params = { mode: 0, variant: 0 };
      expect(await run('quality_top50', ctxWith([score({ pp: 100 })]), params)).toBe(1);
      expect(await run('quality_top50', ctxWith([score({ pp: 99 })]), params)).toBe(0);
      expect(await run('quality_top50', ctxWith([score({ pp: 200, mode: 1 })]), params)).toBe(0);
      expect(await run('quality_top50', ctxWith([score({ pp: 200, passed: false })]), params)).toBe(
        0
      );
    });
    test('quality_top10 asks for the tenth best', async () => {
      let asked = 0;
      queries.nthBest = async (...args: Parameters<typeof queries.nthBest>) => (
        (asked = args[4]),
        100
      );
      expect(
        await run('quality_top10', ctxWith([score({ pp: 120 })]), { mode: 0, variant: 0 })
      ).toBe(1);
      expect(asked).toBe(10);
    });
    test('quality_top rolls null without a top play', () => {
      expect(
        byKey.get('quality_top10')!.roll(fakeContext({}), DEFAULT_SETTINGS, Math.random)
      ).toBeNull();
      const ctx = fakeContext({ bestTopPp: () => ({ mode: 3, variant: 0, pp: 300 }) });
      expect(byKey.get('quality_top50')!.roll(ctx, DEFAULT_SETTINGS, Math.random)).toEqual({
        mode: 3,
        variant: 0
      });
    });
  });
});

describe('mods', () => {
  test('mods_single matches the acronym and treats NC as DT', async () => {
    expect(await run('mods_single', ctxWith([score({ mods: ['NC'] })]), { mod: 'DT' })).toBe(1);
    expect(await run('mods_single', ctxWith([score({ mods: ['DC'] })]), { mod: 'HT' })).toBe(1);
    expect(await run('mods_single', ctxWith([score({ mods: ['HD'] })]), { mod: 'DT' })).toBe(0);
    expect(
      await run('mods_single', ctxWith([score({ mods: ['HD'], passed: false })]), { mod: 'HD' })
    ).toBe(0);
  });
  test('mods_single only rolls FI and MR for mania players', () => {
    const t = byKey.get('mods_single')!;
    const rolled = (favouriteMode: number) =>
      [0, 0.999].map((r) => t.roll(fakeContext({ favouriteMode }), DEFAULT_SETTINGS, () => r)!.mod);
    expect(rolled(3)).toEqual(['HD', 'MR']);
    expect(rolled(0)).toEqual(['HD', 'SO']);
  });
  test('mods_two and mods_three count mods', async () => {
    expect(await run('mods_two', ctxWith([score({ mods: ['HD', 'HR'] })]))).toBe(1);
    expect(await run('mods_two', ctxWith([score({ mods: ['HD'] })]))).toBe(0);
    expect(await run('mods_three', ctxWith([score({ mods: ['HD', 'HR', 'FL'] })]))).toBe(1);
    expect(await run('mods_three', ctxWith([score({ mods: ['HD', 'HR'] })]))).toBe(0);
  });
  test('mods_hdhr and mods_hddt', async () => {
    expect(await run('mods_hdhr', ctxWith([score({ mods: ['HD', 'HR'] })]))).toBe(1);
    expect(await run('mods_hdhr', ctxWith([score({ mods: ['HD'] })]))).toBe(0);
    expect(await run('mods_hddt', ctxWith([score({ mods: ['HD', 'NC'] })]))).toBe(1);
    expect(await run('mods_hddt', ctxWith([score({ mods: ['HR', 'DT'] })]))).toBe(0);
  });
  test('mods_rate and mods_rate_range', async () => {
    expect(await run('mods_rate', ctxWith([score({ rate: 1.5 })]))).toBe(1);
    expect(await run('mods_rate', ctxWith([score()]))).toBe(0);
    expect(await run('mods_rate_range', ctxWith([score({ rate: 1.2 })]))).toBe(1);
    expect(await run('mods_rate_range', ctxWith([score({ rate: 1.5 })]))).toBe(0);
  });
  test('mods_ez_acc', async () => {
    expect(await run('mods_ez_acc', ctxWith([score({ mods: ['EZ'], accuracy: 95 })]))).toBe(1);
    expect(await run('mods_ez_acc', ctxWith([score({ mods: ['EZ'], accuracy: 90 })]))).toBe(0);
  });
  test('mods_ht_fc', async () => {
    expect(await run('mods_ht_fc', ctxWith([score({ mods: ['HT'], misses: 0 })]))).toBe(1);
    expect(await run('mods_ht_fc', ctxWith([score({ mods: ['HT'], misses: 2 })]))).toBe(0);
  });
  test('mods_dt_s', async () => {
    expect(await run('mods_dt_s', ctxWith([score({ mods: ['NC'], grade: 'SH' })]))).toBe(1);
    expect(await run('mods_dt_s', ctxWith([score({ mods: ['DT'], grade: 'A' })]))).toBe(0);
  });
  test('mods_fl_pass, mods_nf_pass, mods_sd_pass', async () => {
    expect(await run('mods_fl_pass', ctxWith([score({ mods: ['FL'] })]))).toBe(1);
    expect(await run('mods_fl_pass', ctxWith([score({ mods: ['FL'], passed: false })]))).toBe(0);
    expect(await run('mods_nf_pass', ctxWith([score({ mods: ['NF'] })]))).toBe(1);
    expect(await run('mods_nf_pass', ctxWith([score()]))).toBe(0);
    expect(await run('mods_sd_pass', ctxWith([score({ mods: ['PF'] })]))).toBe(1);
    expect(await run('mods_sd_pass', ctxWith([score({ mods: ['HD'] })]))).toBe(0);
  });
  test('mods_relax_stars', async () => {
    expect(await run('mods_relax_stars', ctxWith([withMap({ stars: 6 }, { variant: 1 })]))).toBe(1);
    expect(await run('mods_relax_stars', ctxWith([withMap({ stars: 7 })]))).toBe(0);
    expect(await run('mods_relax_stars', ctxWith([withMap({ stars: 5 }, { variant: 2 })]))).toBe(0);
  });
});

describe('leaderboard', () => {
  const ranked = (rank: number, previousFirst: number | null = null) => ({
    leaderboardRank: async () => ({ rank, previousFirst })
  });
  test('leaderboard_first', async () => {
    expect(await run('leaderboard_first', ctxWith([score()], ranked(1)))).toBe(1);
    expect(await run('leaderboard_first', ctxWith([score()], ranked(2)))).toBe(0);
  });
  test('only best passed plays are looked up', async () => {
    expect(await run('leaderboard_first', ctxWith([score({ isBest: false })], ranked(1)))).toBe(0);
    expect(await run('leaderboard_first', ctxWith([score({ passed: false })], ranked(1)))).toBe(0);
  });
  test('lookups are capped at the 20 strongest plays', async () => {
    let calls = 0;
    const plays = Array.from({ length: 30 }, (_, id) => score({ id, pp: id }));
    const ctx = ctxWith(plays, {
      leaderboardRank: async (s) => {
        calls++;
        return { rank: s.pp >= 10 ? 5 : 1, previousFirst: null };
      }
    });
    expect(await run('leaderboard_first', ctx)).toBe(0);
    expect(calls).toBe(20);
  });
  test('leaderboard_three_firsts', async () => {
    const plays = [1, 2, 3].map((id) => score({ id }));
    expect(await run('leaderboard_three_firsts', ctxWith(plays, ranked(1)))).toBe(3);
    expect(await run('leaderboard_three_firsts', ctxWith(plays, ranked(2)))).toBe(0);
  });
  test('leaderboard_steal needs someone else to have held first', async () => {
    expect(await run('leaderboard_steal', ctxWith([score()], ranked(1, 77)))).toBe(1);
    expect(await run('leaderboard_steal', ctxWith([score()], ranked(1, null)))).toBe(0);
    expect(await run('leaderboard_steal', ctxWith([score()], ranked(1, 1)))).toBe(0);
    expect(await run('leaderboard_steal', ctxWith([score()], ranked(2, 77)))).toBe(0);
  });
  test('leaderboard_top10', async () => {
    expect(await run('leaderboard_top10', ctxWith([score()], ranked(10)))).toBe(1);
    expect(await run('leaderboard_top10', ctxWith([score()], ranked(11)))).toBe(0);
  });
  test('leaderboard_top50_stars', async () => {
    expect(await run('leaderboard_top50_stars', ctxWith([score()], ranked(50)))).toBe(1);
    expect(await run('leaderboard_top50_stars', ctxWith([score()], ranked(51)))).toBe(0);
    expect(await run('leaderboard_top50_stars', ctxWith([withMap({ stars: 4 })], ranked(5)))).toBe(
      0
    );
  });
});

describe('multiplayer', () => {
  const ranked = (...rows: { won: boolean; roundsWon: number }[]) => ({
    rankedPlay: async () => rows.map((row, matchId) => ({ matchId, ...row }))
  });
  const lobby = (...won: boolean[]) => ({
    multiplayer: async () => won.map((w, game) => ({ matchId: 1, game, won: w }))
  });
  test('rp_play', async () => {
    expect(await run('rp_play', fakeContext(ranked({ won: false, roundsWon: 0 })))).toBe(1);
    expect(await run('rp_play', fakeContext({}))).toBe(0);
  });
  test('rp_win', async () => {
    expect(await run('rp_win', fakeContext(ranked({ won: true, roundsWon: 2 })))).toBe(1);
    expect(await run('rp_win', fakeContext(ranked({ won: false, roundsWon: 2 })))).toBe(0);
  });
  test('rp_rounds sums rounds won', async () => {
    const ctx = fakeContext(ranked({ won: true, roundsWon: 2 }, { won: false, roundsWon: 1 }));
    expect(await run('rp_rounds', ctx, { count: 3 })).toBe(3);
    expect(await run('rp_rounds', fakeContext({}), { count: 3 })).toBe(0);
  });
  test('rp_three counts matches', async () => {
    const row = { won: false, roundsWon: 0 };
    expect(await run('rp_three', fakeContext(ranked(row, row, row)))).toBe(3);
    expect(await run('rp_three', fakeContext({}))).toBe(0);
  });
  test('mp_play and mp_win', async () => {
    expect(await run('mp_play', fakeContext(lobby(false)))).toBe(1);
    expect(await run('mp_play', fakeContext({}))).toBe(0);
    expect(await run('mp_win', fakeContext(lobby(false, true)))).toBe(1);
    expect(await run('mp_win', fakeContext(lobby(false)))).toBe(0);
  });
  test('links point at the pages', () => {
    expect(byKey.get('rp_win')!.link!({})).toBe('/ranked-play');
    expect(byKey.get('mp_win')!.link!({})).toBe('/multiplayer');
  });
});

describe('casino', () => {
  type Row = { game: string; bet: number; multiplier: number; payout: number };
  const row = (game: string, bet: number, multiplier: number): Row => ({
    game,
    bet,
    multiplier,
    payout: bet * multiplier
  });
  const played = (...rows: Row[]) => fakeContext({ casino: async () => rows });
  test('casino_play', async () => {
    expect(await run('casino_play', played(row('slots', 10, 0)))).toBe(1);
    expect(await run('casino_play', played())).toBe(0);
  });
  test('casino_three_games counts distinct games', async () => {
    expect(
      await run('casino_three_games', played(row('a', 1, 1), row('b', 1, 1), row('a', 1, 1)))
    ).toBe(2);
    expect(await run('casino_three_games', played())).toBe(0);
  });
  test('casino_new_game', async () => {
    const ctx = (week: string[]) => ({
      ...played(row('slots', 10, 0)),
      weekGames: async () => week
    });
    expect(await run('casino_new_game', ctx(['blackjack']))).toBe(1);
    expect(await run('casino_new_game', ctx(['slots']))).toBe(0);
    expect(await run('casino_new_game', played())).toBe(0);
  });
  test('casino_wager sums bets and scales with coins', async () => {
    expect(
      await run('casino_wager', played(row('slots', 30, 0), row('slots', 40, 0)), { coins: 100 })
    ).toBe(70);
    expect(await run('casino_wager', played(), { coins: 100 })).toBe(0);
    const t = byKey.get('casino_wager')!;
    expect(t.roll(fakeContext({ coins: 100 }), DEFAULT_SETTINGS, Math.random)).toEqual({
      coins: 50
    });
    expect(t.roll(fakeContext({ coins: 2000 }), DEFAULT_SETTINGS, Math.random)).toEqual({
      coins: 200
    });
  });
  test('casino_big_win', async () => {
    expect(await run('casino_big_win', played(row('slots', 10, 3)))).toBe(1);
    expect(await run('casino_big_win', played(row('slots', 10, 2.9)))).toBe(0);
  });
  test('casino_blackjack', async () => {
    expect(await run('casino_blackjack', played(row('blackjack', 10, 2)))).toBe(1);
    expect(await run('casino_blackjack', played(row('blackjack', 10, 1)))).toBe(0);
    expect(await run('casino_blackjack', played(row('slots', 10, 2)))).toBe(0);
  });
  test('casino_slots_10x', async () => {
    expect(await run('casino_slots_10x', played(row('slots', 10, 10)))).toBe(1);
    expect(await run('casino_slots_10x', played(row('slots', 10, 5)))).toBe(0);
  });
  test('casino_aviator', async () => {
    expect(await run('casino_aviator', played(row('aviator', 10, 2)))).toBe(1);
    expect(await run('casino_aviator', played(row('aviator', 10, 0)))).toBe(0);
  });
  test('casino_chicken', async () => {
    expect(await run('casino_chicken', played(row('chicken_road', 10, 2)))).toBe(1);
    expect(await run('casino_chicken', played(row('chicken_road', 10, 1.2)))).toBe(0);
  });
  test('casino_profit needs a net gain', async () => {
    expect(await run('casino_profit', played(row('slots', 100, 2), row('slots', 50, 0)))).toBe(1);
    expect(await run('casino_profit', played(row('slots', 100, 2), row('slots', 100, 0)))).toBe(0);
  });
  test('casino_shop', async () => {
    expect(await run('casino_shop', fakeContext({ casinoPurchases: async () => 1 }))).toBe(1);
    expect(await run('casino_shop', fakeContext({}))).toBe(0);
  });
  test('casino_lose', async () => {
    expect(await run('casino_lose', played(row('slots', 10, 0)))).toBe(1);
    expect(await run('casino_lose', played(row('slots', 10, 1)))).toBe(0);
  });
  test('links use the casino marker', () => {
    expect(byKey.get('casino_play')!.link!({})).toBe('casino');
  });
});

describe('meme', () => {
  test('meme_combo is an exact combo', async () => {
    expect(await run('meme_combo', ctxWith([score({ combo: 727 })]), { combo: 727 })).toBe(1);
    expect(await run('meme_combo', ctxWith([score({ combo: 728 })]), { combo: 727 })).toBe(0);
  });
  test('meme_fail wants a failed play', async () => {
    expect(await run('meme_fail', ctxWith([score({ passed: false })]))).toBe(1);
    expect(await run('meme_fail', ctxWith([score()]))).toBe(0);
  });
});
