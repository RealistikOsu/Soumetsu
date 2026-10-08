import type { Prisma } from '$server/generated/client';
import { play } from '../play';
import type { GameRunner } from '../play';
import { bingo, bingoInfo, bingoMax, parseBingoInput } from './bingo';
import { coinflip, coinflipMax, parseCoinflipInput } from './coinflip';
import { parsePlinkoInput, plinko, plinkoInfo, plinkoMax } from './plinko';
import { parseRouletteInput, roulette, rouletteInfo, rouletteMax } from './roulette';
import { parseSlotsInput, slots, slotsInfo, slotsMax } from './slots';
import type { Game, GameConfig } from './types';
import { parseWheelInput, wheel, wheelInfo, wheelMax } from './wheel';
import { parseZeusInput, zeus, zeusInfo, zeusMax } from './zeus';

export type InstantGame = 'coinflip' | 'plinko' | 'slots' | 'zeus' | 'wheel' | 'roulette' | 'bingo';

interface InstantEntry {
  info(odds: unknown): unknown;
  max(odds: unknown): number;
  prepare(
    raw: unknown,
    cfg: GameConfig
  ): (userId: number, game: Game, bet: unknown) => ReturnType<typeof play>;
}

const entry = <O, I, R extends Prisma.InputJsonObject>(e: {
  parseInput: (raw: unknown, odds: O) => I;
  run: GameRunner<O, I, R>;
  info: (odds: O) => unknown;
  max: (odds: O) => number;
}): InstantEntry => ({
  info: (odds) => e.info(odds as O),
  max: (odds) => e.max(odds as O),
  prepare: (raw, cfg) => {
    const input = e.parseInput(raw, cfg.odds as O);
    return (userId, game, bet) =>
      play(userId, game, bet, input, e.run, undefined, cfg as GameConfig<O>);
  }
});

export const instantGames: Record<InstantGame, InstantEntry> = {
  coinflip: entry({
    parseInput: parseCoinflipInput,
    run: coinflip,
    info: () => ({}),
    max: coinflipMax
  }),
  plinko: entry({
    parseInput: parsePlinkoInput,
    run: plinko,
    info: plinkoInfo,
    max: plinkoMax
  }),
  slots: entry({
    parseInput: parseSlotsInput,
    run: slots,
    info: slotsInfo,
    max: slotsMax
  }),
  zeus: entry({ parseInput: parseZeusInput, run: zeus, info: zeusInfo, max: zeusMax }),
  wheel: entry({ parseInput: parseWheelInput, run: wheel, info: wheelInfo, max: wheelMax }),
  roulette: entry({
    parseInput: parseRouletteInput,
    run: roulette,
    info: rouletteInfo,
    max: rouletteMax
  }),
  bingo: entry({ parseInput: parseBingoInput, run: bingo, info: bingoInfo, max: bingoMax })
};
