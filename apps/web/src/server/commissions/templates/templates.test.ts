import { describe, expect, test } from 'bun:test';
import { fakeContext, type DailyRow, type PlayerContext } from '../context';
import type { DayScore } from '../scores';
import { DEFAULT_SETTINGS } from '../settings';
import { byKey } from './index';

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
