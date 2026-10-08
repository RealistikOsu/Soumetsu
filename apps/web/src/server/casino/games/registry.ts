import type { Prisma } from '$server/generated/client';
import { play } from '../play';
import type { GameRunner } from '../play';
import { bingo, bingoInfo, bingoMax, parseBingoInput, parseBingoOdds } from './bingo';
import { coinflip, coinflipMax, parseCoinflipInput, parseCoinflipOdds } from './coinflip';
import { parsePokerOdds, pokerMax } from './poker';
import { parsePlinkoInput, parsePlinkoOdds, plinko, plinkoInfo, plinkoMax } from './plinko';
import {
  parseRouletteInput,
  parseRouletteOdds,
  roulette,
  rouletteInfo,
  rouletteMax
} from './roulette';
import { parseSlotsInput, parseSlotsOdds, slots, slotsInfo, slotsMax } from './slots';
import type { Game, GameConfig } from './types';
import { parseWheelInput, parseWheelOdds, wheel, wheelInfo, wheelMax } from './wheel';
import { parseZeusInput, parseZeusOdds, zeus, zeusInfo, zeusMax } from './zeus';

export type InstantGame = 'coinflip' | 'plinko' | 'slots' | 'zeus' | 'wheel' | 'roulette' | 'bingo';

interface InstantEntry {
  info(odds: unknown): unknown;
  max(odds: unknown): number;
  // Parses the body against the odds first, so a bad body never reaches the rate limit.
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

// Games that aren't ported yet keep whatever object the admin saves.
const passThrough = (raw: unknown) =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;

export const oddsParsers: Record<Game, (raw: unknown) => unknown | null> = {
  coinflip: parseCoinflipOdds,
  plinko: parsePlinkoOdds,
  slots: parseSlotsOdds,
  zeus: parseZeusOdds,
  wheel: parseWheelOdds,
  roulette: parseRouletteOdds,
  bingo: parseBingoOdds,
  poker: parsePokerOdds,
  mines: passThrough,
  chicken_road: passThrough,
  aviator: passThrough,
  blackjack: passThrough
};

export const maxMultipliers: Partial<Record<Game, (odds: never) => number>> = {
  coinflip: coinflipMax,
  plinko: plinkoMax,
  slots: slotsMax,
  zeus: zeusMax,
  wheel: wheelMax,
  roulette: rouletteMax,
  bingo: bingoMax,
  poker: pokerMax
};
