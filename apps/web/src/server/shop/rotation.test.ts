import { describe, expect, test } from 'bun:test';
import { supporterDecorations } from '$lib/decorations';
import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from './settings';
import { inWindow, monthKey, supporterPicks } from './rotation';

const supporter = supporterDecorations.map((d) => d.key);
const october = new Date('2026-10-08T12:00:00Z');

describe('supporterPicks', () => {
  test('picks are deterministic per month', () => {
    const first = supporterPicks(DEFAULT_SHOP_SETTINGS, october);
    expect(supporterPicks(DEFAULT_SHOP_SETTINGS, new Date('2026-10-31T23:59:59Z'))).toEqual(first);
    expect(supporterPicks(DEFAULT_SHOP_SETTINGS, new Date('2026-11-01T00:00:00Z'))).not.toEqual(
      first
    );
  });

  test('returns three distinct supporter keys', () => {
    const picks = supporterPicks(DEFAULT_SHOP_SETTINGS, october);
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
    for (const key of picks) expect(supporter).toContain(key);
  });

  test('a pin overrides the shuffle', () => {
    const pinned = [...supporter.slice(0, 3)].reverse();
    const settings: ShopSettings = {
      ...DEFAULT_SHOP_SETTINGS,
      supporterPins: { '2026-10': pinned }
    };
    expect(supporterPicks(settings, october)).toEqual(pinned);
  });
});

describe('monthKey', () => {
  test('uses UTC', () => {
    expect(monthKey(new Date('2026-09-30T23:59:59Z'))).toBe('2026-09');
    expect(monthKey(new Date('2026-10-01T00:00:00Z'))).toBe('2026-10');
  });
});

describe('inWindow', () => {
  const settings: ShopSettings = {
    ...DEFAULT_SHOP_SETTINGS,
    spotlight: [
      { key: 'royal', from: '2026-10-01T00:00:00Z', until: '2026-10-08T00:00:00Z' },
      { key: 'royal', from: '2026-10-05T00:00:00Z', until: '2026-10-12T00:00:00Z' }
    ]
  };

  test('window check is exclusive at the end', () => {
    const one: ShopSettings = { ...settings, spotlight: [settings.spotlight[0]] };
    expect(inWindow(one, 'royal', new Date('2026-10-01T00:00:00Z'))).toBe(true);
    expect(inWindow(one, 'royal', new Date('2026-10-07T23:59:59Z'))).toBe(true);
    expect(inWindow(one, 'royal', new Date('2026-10-08T00:00:00Z'))).toBe(false);
    expect(inWindow(one, 'royal', new Date('2026-09-30T23:59:59Z'))).toBe(false);
  });

  test('overlapping windows extend each other', () => {
    expect(inWindow(settings, 'royal', new Date('2026-10-08T00:00:00Z'))).toBe(true);
    expect(inWindow(settings, 'royal', new Date('2026-10-12T00:00:00Z'))).toBe(false);
  });

  test('other keys are never in a window', () => {
    expect(inWindow(settings, 'coral', new Date('2026-10-06T00:00:00Z'))).toBe(false);
  });
});
