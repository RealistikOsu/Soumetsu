import { describe, expect, test } from 'bun:test';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
  test('accepts the defaults', () => {
    expect(parseSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  test('fills missing optional lists from the defaults', () => {
    const parsed = parseSettings({ ...DEFAULT_SETTINGS, artists: undefined, weights: undefined });
    expect(parsed?.artists).toEqual(DEFAULT_SETTINGS.artists);
    expect(parsed?.weights).toEqual({});
  });

  test("rejects a threshold list that isn't ascending", () => {
    const thresholds = [
      { points: 200, coins: 50 },
      { points: 100, coins: 60 },
      { points: 300, coins: 90 }
    ];
    expect(parseSettings({ ...DEFAULT_SETTINGS, thresholds })).toBeNull();
  });

  test('rejects anything that is not three thresholds', () => {
    expect(
      parseSettings({ ...DEFAULT_SETTINGS, thresholds: DEFAULT_SETTINGS.thresholds.slice(0, 2) })
    ).toBeNull();
  });

  test('rejects non-positive numbers and bad weights', () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, tasksPerDay: 0 })).toBeNull();
    expect(parseSettings({ ...DEFAULT_SETTINGS, weights: { play_count: -1 } })).toBeNull();
    expect(
      parseSettings({ ...DEFAULT_SETTINGS, famousMaps: [{ beatmapId: 'x', name: 'y' }] })
    ).toBeNull();
  });

  test('rejects a day minimum below the top threshold', () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, minDayPoints: 299 })).toBeNull();
    expect(parseSettings({ ...DEFAULT_SETTINGS, minDayPoints: 300 })).not.toBeNull();
  });

  test('falls back to defaults on bad settings', () => {
    expect(parseSettings('garbage')).toBeNull();
    expect(parseSettings(null)).toBeNull();
  });
});

describe('lazerTasks', () => {
  test('defaults to on and rejects non-booleans', () => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, lazerTasks: undefined })?.lazerTasks).toBe(true);
    expect(parseSettings({ ...DEFAULT_SETTINGS, lazerTasks: false })?.lazerTasks).toBe(false);
    expect(parseSettings({ ...DEFAULT_SETTINGS, lazerTasks: 'no' })).toBeNull();
  });
});
