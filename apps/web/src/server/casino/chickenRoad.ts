import { Failure } from '$server/respond';
import { crossLane } from './games/chickenRoad';
import type { ChickenOdds } from './games/chickenRoad';
import { payoutFor } from './games/types';
import { cryptoRng } from './play';
import * as session from './session';
import type { Settle, StepOutcome } from './session';

interface Run {
  bet: number;
  step: number;
  odds: ChickenOdds;
}

export interface ChickenResult {
  [key: string]: number;
  steps: number;
}

// Built field by field so the survival odds stay on the server.
export function view({ bet, step, odds }: Run) {
  return {
    bet,
    step,
    // The run's own lanes, so a running game keeps them if the odds change mid-game.
    multipliers: odds.multipliers,
    multiplier: step > 0 ? odds.multipliers[step - 1] : 1,
    next: odds.multipliers[step] ?? null
  };
}

export type ChickenView = ReturnType<typeof view>;

function cashOut({ bet, step, odds }: Run): Settle<ChickenResult> {
  if (step === 0) return { multiplier: 1, base: bet, result: { steps: 0 }, refund: true };
  const multiplier = odds.multipliers[step - 1];
  return { multiplier, base: payoutFor(bet, multiplier), result: { steps: step } };
}

export async function start(userId: number, rawBet: unknown, rng: () => number = cryptoRng) {
  return session.begin(
    userId,
    'chicken_road',
    rawBet,
    (odds: ChickenOdds, bet): Run => ({ bet, step: 0, odds }),
    view,
    rng
  );
}

export async function advance(userId: number, rng: () => number = cryptoRng) {
  return session.step(
    userId,
    'chicken_road',
    (run: Run, rng): StepOutcome<Run, ChickenView, ChickenResult> => {
      const { step, odds } = run;
      if (step >= odds.multipliers.length) throw new Failure(400, 'casino.invalid_move');

      if (!crossLane(odds, step, rng)) {
        const result = { steps: step, crashedAt: step + 1 };
        return { settle: { multiplier: 0, base: 0, result }, view: view(run) };
      }

      const next = { ...run, step: step + 1 };
      if (next.step === odds.multipliers.length) return { settle: cashOut(next), view: view(next) };
      return { state: next, view: view(next) };
    },
    rng
  );
}

export async function cashout(userId: number) {
  const played = await session.step(userId, 'chicken_road', (run: Run) => ({
    settle: cashOut(run),
    view: view(run)
  }));
  if (!('result' in played)) throw new Error('A chicken road cash out always settles');
  return played;
}

export const pending = (userId: number) => session.pending(userId, 'chicken_road', view);
