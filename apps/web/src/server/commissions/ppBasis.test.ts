import { describe, expect, test } from 'bun:test';
import { MIN_BESTS, pickBucket, targetPp, type BucketCount } from './ppBasis';

const bucket = (
  source: 'stable' | 'lazer',
  mode: number,
  variant: number,
  n: number
): BucketCount => ({ source, mode, variant, n });

describe('pickBucket', () => {
  const bests = [
    bucket('stable', 0, 0, 400),
    bucket('stable', 0, 1, 60),
    bucket('lazer', 0, 0, 30)
  ];

  test('picks the bucket played most in the last two weeks', () => {
    const recent = [bucket('stable', 0, 0, 5), bucket('stable', 0, 1, 40)];
    expect(pickBucket(recent, bests)).toEqual(bucket('stable', 0, 1, 60));
  });
  test('keeps stable and lazer apart', () => {
    const recent = [bucket('stable', 0, 0, 5), bucket('lazer', 0, 0, 9)];
    expect(pickBucket(recent, bests)).toEqual(bucket('lazer', 0, 0, 30));
  });
  test('falls back to the most best plays without recent plays', () => {
    expect(pickBucket([], bests)).toEqual(bucket('stable', 0, 0, 400));
  });
  test(`needs ${MIN_BESTS} best plays in the chosen bucket`, () => {
    const recent = [bucket('lazer', 1, 0, 50)];
    expect(pickBucket(recent, [...bests, bucket('lazer', 1, 0, MIN_BESTS - 1)])).toBeNull();
    expect(pickBucket(recent, [...bests, bucket('lazer', 1, 0, MIN_BESTS)])).toEqual(
      bucket('lazer', 1, 0, MIN_BESTS)
    );
    expect(pickBucket([], [])).toBeNull();
  });
});

describe('targetPp', () => {
  const basis = { source: 'stable' as const, mode: 0, variant: 0, top: [412.9, 300, 99.9] };
  test('rounds the nth best down to 5', () => {
    expect(targetPp(basis, 1)).toBe(410);
    expect(targetPp(basis, 3)).toBe(95);
    expect(targetPp(basis, 3, 3)).toBe(295);
  });
  test('never under 10pp, and null past the end', () => {
    expect(targetPp({ ...basis, top: [7] }, 1)).toBe(10);
    expect(targetPp(basis, 4)).toBeNull();
  });
});
