import { describe, expect, test } from 'bun:test';
import { fakeContext, type DailyRow, type PlayerContext } from '../context';
import type { DayScore } from '../scores';
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
