import { describe, expect, test } from 'bun:test';
import { supporterDecorations } from '$lib/decorations';
import { DEFAULT_SHOP_SETTINGS, parseShopSettings } from './settings';

const supporter = supporterDecorations.map((d) => d.key);

describe('parseShopSettings', () => {
  test('accepts the defaults', () => {
    expect(parseShopSettings(DEFAULT_SHOP_SETTINGS)).toEqual(DEFAULT_SHOP_SETTINGS);
  });

  test('fills missing lists', () => {
    const parsed = parseShopSettings({ supporterPrice: 100 });
    expect(parsed).toEqual({ supporterPrice: 100, spotlight: [], supporterPins: {} });
  });

  test('rejects a bad price', () => {
    expect(parseShopSettings({ supporterPrice: 0 })).toBeNull();
    expect(parseShopSettings({ supporterPrice: 1.5 })).toBeNull();
  });

  test('accepts a valid window', () => {
    const spotlight = [
      { key: 'royal', from: '2026-10-01T00:00:00Z', until: '2026-10-08T00:00:00Z' }
    ];
    expect(parseShopSettings({ ...DEFAULT_SHOP_SETTINGS, spotlight })?.spotlight).toEqual(
      spotlight
    );
  });

  test('rejects until <= from', () => {
    const at = '2026-10-01T00:00:00Z';
    const spotlight = [{ key: 'royal', from: at, until: at }];
    expect(parseShopSettings({ ...DEFAULT_SHOP_SETTINGS, spotlight })).toBeNull();
  });

  test('rejects an unknown or non-shop key', () => {
    const window = { from: '2026-10-01T00:00:00Z', until: '2026-10-08T00:00:00Z' };
    expect(
      parseShopSettings({ ...DEFAULT_SHOP_SETTINGS, spotlight: [{ key: 'nope', ...window }] })
    ).toBeNull();
    expect(
      parseShopSettings({ ...DEFAULT_SHOP_SETTINGS, spotlight: [{ key: supporter[0], ...window }] })
    ).toBeNull();
  });

  test('rejects an unparseable date', () => {
    const spotlight = [{ key: 'royal', from: 'soon', until: '2026-10-08T00:00:00Z' }];
    expect(parseShopSettings({ ...DEFAULT_SHOP_SETTINGS, spotlight })).toBeNull();
  });

  test('accepts a pin of three distinct keys', () => {
    const supporterPins = { '2026-10': supporter.slice(0, 3) };
    expect(parseShopSettings({ ...DEFAULT_SHOP_SETTINGS, supporterPins })?.supporterPins).toEqual(
      supporterPins
    );
  });

  test('rejects a pin with 2 keys', () => {
    const supporterPins = { '2026-10': supporter.slice(0, 2) };
    expect(parseShopSettings({ ...DEFAULT_SHOP_SETTINGS, supporterPins })).toBeNull();
  });

  test('rejects a pin with duplicates, unknown keys or a bad month', () => {
    const base = DEFAULT_SHOP_SETTINGS;
    expect(
      parseShopSettings({
        ...base,
        supporterPins: { '2026-10': [supporter[0], supporter[0], supporter[1]] }
      })
    ).toBeNull();
    expect(
      parseShopSettings({
        ...base,
        supporterPins: { '2026-10': [supporter[0], supporter[1], 'nope'] }
      })
    ).toBeNull();
    expect(
      parseShopSettings({ ...base, supporterPins: { october: supporter.slice(0, 3) } })
    ).toBeNull();
  });
});
