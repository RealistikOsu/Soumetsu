import { Failure } from '$server/respond';
import { MAX_MULTIPLIER, isRecord, shuffle } from './types';

export interface MinesOdds {
  grid: number;
  edgeBase: number;
  edgeScale: number;
  edgePower: number;
}

const isPositive = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

export function parseMinesOdds(raw: unknown): MinesOdds | null {
  if (!isRecord(raw)) return null;
  const { grid, edgeBase, edgeScale, edgePower } = raw;
  if (!Number.isInteger(grid) || (grid as number) < 2 || (grid as number) > 100) return null;
  if (!isPositive(edgeBase) || !isPositive(edgePower)) return null;
  if (typeof edgeScale !== 'number' || !Number.isFinite(edgeScale) || edgeScale < 0) return null;
  // The edge is the share of fair odds paid out, so above 1 the house pays more than fair.
  if (edgeBase + edgeScale > 1) return null;
  return { grid: grid as number, edgeBase, edgeScale, edgePower };
}

export const minesMax = () => MAX_MULTIPLIER;

export const minesInfo = (o: MinesOdds) => ({ grid: o.grid });

export function minesMultiplier(odds: MinesOdds, mines: number, revealed: number): number {
  if (revealed === 0) return 1;
  const { grid, edgeBase, edgeScale, edgePower } = odds;
  const safe = grid - mines;
  let probability = 1;
  for (let i = 0; i < revealed; i++) probability *= (safe - i) / (grid - i);
  const edge = edgeBase + edgeScale * Math.pow(revealed / safe, edgePower);
  return Math.min(parseFloat((edge / probability).toFixed(2)), MAX_MULTIPLIER);
}

export function placeMines(grid: number, count: number, rng: () => number): number[] {
  return shuffle(
    Array.from({ length: grid }, (_, i) => i),
    rng
  ).slice(0, count);
}

const isIntIn = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export function parseMineCount(raw: unknown, grid: number): number {
  if (!isIntIn(raw, 1, grid - 1)) throw new Failure(400, 'site.invalid_request');
  return raw;
}

export function parseTile(raw: unknown, grid: number): number {
  if (!isIntIn(raw, 0, grid - 1)) throw new Failure(400, 'site.invalid_request');
  return raw;
}
