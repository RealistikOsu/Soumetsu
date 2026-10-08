import { describe, expect, test } from 'bun:test';
import { sequence } from '../../../../test/rng';
import { aviatorInfo, aviatorMax, crashPoint, multiplierAt, parseAviatorOdds } from './aviator';
import type { AviatorOdds } from './aviator';

const seeded = {
  instantCrash: 0.01,
  numerator: 100,
  maxCrash: 1000,
  curve: { rate: 0.15, power: 1.2 }
};
const odds = parseAviatorOdds(seeded) as AviatorOdds;

// lib/aviatorWs.mjs, verbatim apart from the start time.
function casinoMultiplier(elapsedMs: number) {
  if (elapsedMs <= 0) return 1.0;
  const elapsedSecs = elapsedMs / 1000;
  const rawM = 1.0 + Math.pow(elapsedSecs * 0.15, 1.2);
  return Math.floor(rawM * 100) / 100;
}

describe('parseAviatorOdds', () => {
  test('accepts the seeded odds', () => {
    expect(odds).toEqual(seeded);
  });

  test('drops unknown fields', () => {
    expect(parseAviatorOdds({ ...seeded, extra: 1, curve: { ...seeded.curve, x: 2 } })).toEqual(
      seeded
    );
  });

  test('rejects bad shapes', () => {
    for (const raw of [
      null,
      [],
      {},
      { ...seeded, instantCrash: -0.1 },
      { ...seeded, instantCrash: 1 },
      { ...seeded, instantCrash: '0.01' },
      { ...seeded, numerator: 99 },
      { ...seeded, numerator: Infinity },
      { ...seeded, maxCrash: 1 },
      { ...seeded, maxCrash: 10000 },
      { ...seeded, curve: null },
      { ...seeded, curve: { rate: 0, power: 1.2 } },
      { ...seeded, curve: { rate: 0.15, power: -1 } },
      { ...seeded, curve: { rate: 0.15 } }
    ])
      expect(parseAviatorOdds(raw)).toBeNull();
  });

  test('max and info', () => {
    expect(aviatorMax(odds)).toBe(1000);
    expect(aviatorInfo(odds)).toEqual({ curve: seeded.curve });
    for (const key of ['instantCrash', 'numerator', 'maxCrash', 'crashPoint'])
      expect(aviatorInfo(odds)).not.toHaveProperty(key);
  });
});

describe('crashPoint', () => {
  test('crashes instantly strictly below the instant odds', () => {
    expect(crashPoint(odds, sequence([0]))).toBe(1);
    expect(crashPoint(odds, sequence([0.0099]))).toBe(1);
    expect(crashPoint(odds, sequence([0.01]))).toBe(1.01);
  });

  test('follows the casino formula', () => {
    expect(crashPoint(odds, sequence([0.5]))).toBe(2);
    expect(crashPoint(odds, sequence([0.75]))).toBe(4);
    for (const r of [0.1, 0.333, 0.9, 0.95, 0.99, 0.999])
      expect(crashPoint(odds, sequence([r]))).toBe(Math.floor(100 / (1 - r)) / 100);
  });

  test('caps at the max', () => {
    expect(crashPoint(odds, sequence([0.99991]))).toBe(1000);
    expect(crashPoint(odds, sequence([0.9999999]))).toBe(1000);
  });

  test('draws once', () => {
    const rng = sequence([0.5]);
    crashPoint(odds, rng);
    expect(rng.used()).toBe(1);
  });
});

describe('multiplierAt', () => {
  test('starts at 1', () => {
    expect(multiplierAt(odds.curve, 0)).toBe(1);
    expect(multiplierAt(odds.curve, -500)).toBe(1);
  });

  test('reaches 2× at 1/rate seconds', () => {
    expect(multiplierAt(odds.curve, 6_600)).toBe(1.98);
    expect(multiplierAt(odds.curve, 6_667)).toBe(2);
  });

  test('matches the casino', () => {
    for (const ms of [1, 100, 1_000, 5_300, 10_000, 24_500, 41_600, 100_000, 330_000, 600_000])
      expect(multiplierAt(odds.curve, ms)).toBe(casinoMultiplier(ms));
  });
});
