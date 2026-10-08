import { describe, expect, test } from 'bun:test';
import { isItemType } from './listing';

describe('isItemType', () => {
  test('knows the four types', () => {
    for (const type of ['decoration', 'username_change', 'custom_badge', 'score_wipe'])
      expect(isItemType(type)).toBe(true);
  });

  test('rejects anything else', () => {
    expect(isItemType('mystery')).toBe(false);
    expect(isItemType('')).toBe(false);
  });
});
