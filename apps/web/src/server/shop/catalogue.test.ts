import { describe, expect, test } from 'bun:test';
import { shopDecorations } from '$lib/decorations';
import { pickable } from './catalogue';

const DONOR = 4;
const ADMIN_ACCESS_RAP = 8;

describe('pickable', () => {
  test('default styles are always pickable', () => {
    expect(pickable('red', { privileges: 0, owned: [] })).toBe(true);
  });

  test('supporter styles need the Donor bit', () => {
    expect(pickable('sunset', { privileges: DONOR, owned: [] })).toBe(true);
    expect(pickable('sunset', { privileges: 0, owned: [] })).toBe(false);
  });

  test('owned supporter style stays pickable without the tag', () => {
    expect(pickable('sunset', { privileges: 0, owned: ['sunset'] })).toBe(true);
  });

  test('staff styles need panel access', () => {
    expect(pickable('staff-gold', { privileges: ADMIN_ACCESS_RAP, owned: [] })).toBe(true);
    expect(pickable('staff-gold', { privileges: DONOR, owned: [] })).toBe(false);
  });

  test('shop styles are pickable only when owned', () => {
    expect(pickable('candy', { privileges: DONOR | ADMIN_ACCESS_RAP, owned: [] })).toBe(false);
    expect(pickable('candy', { privileges: 0, owned: ['candy'] })).toBe(true);
  });

  test('the coins-only styles are permanent shop stock', () => {
    for (const key of ['cash', 'copper', 'platinum', 'diamond', 'bullion', 'jackpot']) {
      expect(shopDecorations.find((d) => d.key === key)?.stock).toBe('permanent');
      expect(pickable(key, { privileges: DONOR, owned: [] })).toBe(false);
      expect(pickable(key, { privileges: 0, owned: [key] })).toBe(true);
    }
    expect(shopDecorations).toHaveLength(16);
  });

  test('unknown keys never are', () => {
    expect(pickable('nope', { privileges: -1, owned: ['nope'] })).toBe(false);
  });
});
