import { Failure } from '$server/respond';
import type { GameRunner } from '../play';
import { MAX_MULTIPLIER, isAmount, isRecord, payoutFor } from './types';

type PlinkoRisk = 'low' | 'medium' | 'high';

const RISKS: readonly PlinkoRisk[] = ['low', 'medium', 'high'];

export interface PlinkoOdds {
  rows: number[];
  tables: Record<PlinkoRisk, Record<string, number[]>>;
}

export interface PlinkoInput {
  rows: number;
  risk: PlinkoRisk;
}

export type PlinkoResult = { path: number[]; multiplier: number; payout: number };

export function parsePlinkoOdds(raw: unknown): PlinkoOdds | null {
  if (!isRecord(raw)) return null;
  const { rows, tables } = raw;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (!rows.every((r) => Number.isInteger(r) && r > 0 && r <= 32)) return null;
  if (new Set(rows).size !== rows.length) return null;
  if (!isRecord(tables)) return null;

  const out = {} as PlinkoOdds['tables'];
  for (const risk of RISKS) {
    const byRows = tables[risk];
    if (!isRecord(byRows)) return null;
    out[risk] = {};
    for (const r of rows as number[]) {
      const table = byRows[String(r)];
      if (!Array.isArray(table) || table.length !== r + 1) return null;
      if (!table.every((m) => isAmount(m) && m <= MAX_MULTIPLIER)) return null;
      out[risk][String(r)] = table;
    }
  }
  return { rows: rows as number[], tables: out };
}

export const plinkoMax = (o: PlinkoOdds) =>
  Math.max(...RISKS.flatMap((risk) => Object.values(o.tables[risk]).flat()));

export const plinkoInfo = (o: PlinkoOdds) => ({ rows: o.rows, tables: o.tables });

export function parsePlinkoInput(raw: unknown, o: PlinkoOdds): PlinkoInput {
  const { rows, risk } = isRecord(raw) ? raw : {};
  if (typeof rows !== 'number' || !o.rows.includes(rows))
    throw new Failure(400, 'site.invalid_request');
  if (!RISKS.includes(risk as PlinkoRisk)) throw new Failure(400, 'site.invalid_request');
  return { rows, risk: risk as PlinkoRisk };
}

export const plinko: GameRunner<PlinkoOdds, PlinkoInput, PlinkoResult> = (
  odds,
  { rows, risk },
  bet,
  rng
) => {
  const path: number[] = [];
  for (let i = 0; i < rows; i++) path.push(rng() < 0.5 ? 0 : 1);
  const bucket = path.reduce((a, b) => a + b, 0);
  const multiplier = odds.tables[risk][String(rows)][bucket];
  const payout = payoutFor(bet, multiplier);
  return { result: { path, multiplier, payout }, multiplier, payout };
};
