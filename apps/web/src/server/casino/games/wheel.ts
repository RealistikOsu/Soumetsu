import type { GameRunner } from '../play';
import { MAX_MULTIPLIER, isAmount, isRecord, payoutFor } from './types';

export type SegmentType = 'multiplier' | 'penalty' | 'jackpot';

const TYPES: readonly SegmentType[] = ['multiplier', 'penalty', 'jackpot'];

const WEIGHT_KEYS = ['penalty', 'jackpot', 'ge7', 'ge4', 'ge2', 'else'] as const;

export interface WheelOdds {
  segments: [string, number, SegmentType][];
  weights: Record<(typeof WEIGHT_KEYS)[number], number>;
}

export type WheelInput = Record<string, never>;

export type WheelResult = {
  segmentIndex: number;
  segment: { label: string; multiplier: number; type: SegmentType };
  payout: number;
};

const isSegment = (v: unknown): v is [string, number, SegmentType] =>
  Array.isArray(v) &&
  v.length === 3 &&
  typeof v[0] === 'string' &&
  v[0] !== '' &&
  isAmount(v[1]) &&
  v[1] <= MAX_MULTIPLIER &&
  TYPES.includes(v[2]);

// The casino weighted each segment by its type first, then by how big its multiplier is.
function segmentWeight(
  { weights }: WheelOdds,
  [, multiplier, type]: WheelOdds['segments'][number]
) {
  if (type === 'penalty') return weights.penalty;
  if (type === 'jackpot') return weights.jackpot;
  if (multiplier >= 7) return weights.ge7;
  if (multiplier >= 4) return weights.ge4;
  if (multiplier >= 2) return weights.ge2;
  return weights.else;
}

export function parseWheelOdds(raw: unknown): WheelOdds | null {
  if (!isRecord(raw)) return null;
  const { segments, weights } = raw;
  if (!Array.isArray(segments) || segments.length === 0 || !segments.every(isSegment)) return null;
  if (!isRecord(weights)) return null;

  const outWeights = {} as WheelOdds['weights'];
  for (const key of WEIGHT_KEYS) {
    if (!isAmount(weights[key])) return null;
    outWeights[key] = weights[key];
  }
  const odds: WheelOdds = {
    segments: segments.map(([label, multiplier, type]) => [label, multiplier, type]),
    weights: outWeights
  };
  const total = odds.segments.reduce((sum, s) => sum + segmentWeight(odds, s), 0);
  return total > 0 ? odds : null;
}

export const wheelMax = (o: WheelOdds) => Math.max(...o.segments.map(([, m]) => m));

export const wheelInfo = (o: WheelOdds) => ({ segments: o.segments });

export const parseWheelInput = (): WheelInput => ({});

export const wheel: GameRunner<WheelOdds, WheelInput, WheelResult> = (odds, _input, bet, rng) => {
  const weights = odds.segments.map((s) => segmentWeight(odds, s));
  let rand = rng() * weights.reduce((a, b) => a + b, 0);
  let segmentIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) {
      segmentIndex = i;
      break;
    }
  }

  const [label, multiplier, type] = odds.segments[segmentIndex];
  const payout = payoutFor(bet, multiplier);
  return {
    result: { segmentIndex, segment: { label, multiplier, type }, payout },
    multiplier,
    payout
  };
};
