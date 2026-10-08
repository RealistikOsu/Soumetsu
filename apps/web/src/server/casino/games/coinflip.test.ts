import { describe, expect, test } from 'bun:test';
import { coinflip, parseCoinflipInput } from './coinflip';

const odds = { multiplier: 1.75 };

describe('coinflip', () => {
  test('a low roll is heads, a high one tails', () => {
    expect(coinflip(odds, { choice: 'heads' }, 100, () => 0.2).result.outcome).toBe('heads');
    expect(coinflip(odds, { choice: 'heads' }, 100, () => 0.7).result.outcome).toBe('tails');
  });

  test('a win pays the bet times the multiplier', () => {
    expect(coinflip(odds, { choice: 'heads' }, 100, () => 0.2)).toEqual({
      result: { outcome: 'heads', choice: 'heads', won: true },
      multiplier: 1.75,
      payout: 175
    });
  });

  test('rounds the payout down', () => {
    expect(coinflip(odds, { choice: 'tails' }, 3, () => 0.7).payout).toBe(5);
  });

  test('pays in whole hundredths of the multiplier', () => {
    expect(coinflip({ multiplier: 1.15 }, { choice: 'heads' }, 100, () => 0.2).payout).toBe(115);
  });

  test('a loss pays nothing', () => {
    const outcome = coinflip(odds, { choice: 'tails' }, 100, () => 0.2);
    expect(outcome.payout).toBe(0);
    expect(outcome.result.won).toBe(false);
  });
});

describe('parseCoinflipInput', () => {
  test('accepts heads or tails', () => {
    expect(parseCoinflipInput({ choice: 'heads' })).toEqual({ choice: 'heads' });
    expect(parseCoinflipInput({ choice: 'tails', extra: 1 })).toEqual({ choice: 'tails' });
  });

  test('rejects anything else', () => {
    for (const raw of [null, undefined, 'heads', {}, { choice: 'edge' }, { choice: 1 }])
      expect(() => parseCoinflipInput(raw)).toThrow(
        expect.objectContaining({ status: 400, code: 'site.invalid_request' })
      );
  });
});
