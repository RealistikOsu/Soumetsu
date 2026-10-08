import { describe, expect, test } from 'bun:test';
import { payoutFor } from './types';

describe('payoutFor', () => {
  test('uses the multiplier in hundredths', () => {
    expect(payoutFor(100, 1.15)).toBe(115);
    expect(payoutFor(100, 1.75)).toBe(175);
    expect(payoutFor(3, 1.75)).toBe(5);
  });
});
