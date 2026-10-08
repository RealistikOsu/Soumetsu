import { MAX_MULTIPLIER, isRecord } from './types';

export interface ChickenOdds {
  multipliers: number[];
  survival: number[];
}

export function parseChickenOdds(raw: unknown): ChickenOdds | null {
  if (!isRecord(raw)) return null;
  const { multipliers, survival } = raw;
  if (!Array.isArray(multipliers) || !Array.isArray(survival)) return null;
  if (multipliers.length === 0 || multipliers.length !== survival.length) return null;
  for (let i = 0; i < multipliers.length; i++) {
    const m = multipliers[i];
    if (typeof m !== 'number' || !Number.isFinite(m) || m <= 1 || m > MAX_MULTIPLIER) return null;
    if (i > 0 && m <= multipliers[i - 1]) return null;
  }
  if (!survival.every((s) => typeof s === 'number' && s > 0 && s <= 1)) return null;
  return { multipliers, survival };
}

export const chickenMax = (o: ChickenOdds) => o.multipliers[o.multipliers.length - 1];

// The survival odds stay on the server.
export const chickenInfo = (o: ChickenOdds) => ({ multipliers: o.multipliers });

export const crossLane = (odds: ChickenOdds, step: number, rng: () => number) =>
  rng() < odds.survival[step];
