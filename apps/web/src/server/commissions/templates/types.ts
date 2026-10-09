import type { PlayerContext } from '../context';
import type { DayScore } from '../scores';
import type { Settings, Tier } from '../settings';

export type Params = Record<string, string | number | boolean>;

export interface Template {
  key: string;
  family: string;
  tier: Tier;
  roll(ctx: PlayerContext, settings: Settings, random: () => number): Params | null;
  target(params: Params): number;
  check(ctx: PlayerContext, params: Params): Promise<number>;
  link?(params: Params): string | null;
  // True when the task can only be done on lazer, so it can be held back while lazer commissions are off.
  lazer?(params: Params): boolean;
  // True when the check reads data that only settles after the day ends, so yesterday's task is worth rechecking.
  settlesLate?: boolean;
}

export const template = (t: Template) => t;

export const once = (): Params => ({});

export const pick = <T>(list: readonly T[], random: () => number) =>
  list[Math.floor(random() * list.length)];

export async function count(ctx: PlayerContext, predicate: (score: DayScore) => boolean) {
  return (await ctx.scores()).filter((score) => score.passed && predicate(score)).length;
}

export const any = async (ctx: PlayerContext, predicate: (score: DayScore) => boolean) =>
  (await count(ctx, predicate)) > 0 ? 1 : 0;

export function starsAround(ctx: PlayerContext, offset: number) {
  const base = ctx.usualStars ?? 3;
  return Math.round(Math.min(9, Math.max(1, base + offset)) * 10) / 10;
}
