import { MAX_MULTIPLIER, isPositive, isRecord } from './types';

export interface AviatorCurve {
  rate: number;
  power: number;
}

export interface AviatorOdds {
  instantCrash: number;
  numerator: number;
  maxCrash: number;
  curve: AviatorCurve;
}

export function parseAviatorOdds(raw: unknown): AviatorOdds | null {
  if (!isRecord(raw)) return null;
  const { instantCrash, numerator, maxCrash, curve } = raw;
  if (typeof instantCrash !== 'number' || !(instantCrash >= 0 && instantCrash < 1)) return null;
  // Below 100 the crash point could land under 1×.
  if (!isPositive(numerator) || numerator < 100) return null;
  if (!isPositive(maxCrash) || maxCrash <= 1 || maxCrash > MAX_MULTIPLIER) return null;
  if (!isRecord(curve) || !isPositive(curve.rate) || !isPositive(curve.power)) return null;
  return { instantCrash, numerator, maxCrash, curve: { rate: curve.rate, power: curve.power } };
}

export const aviatorMax = (o: AviatorOdds) => o.maxCrash;

// The crash parameters stay on the server; the curve is what the player watches.
export const aviatorInfo = (o: AviatorOdds) => ({ curve: o.curve });

export function crashPoint(odds: AviatorOdds, rng: () => number): number {
  const r = rng();
  if (r < odds.instantCrash) return 1;
  return Math.min(Math.floor(odds.numerator / (1 - r)) / 100, odds.maxCrash);
}

export function multiplierAt({ rate, power }: AviatorCurve, elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  const t = elapsedMs / 1000;
  return Math.floor((1 + Math.pow(t * rate, power)) * 100) / 100;
}
