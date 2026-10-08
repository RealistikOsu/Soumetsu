import type { GameRunner } from '../play';
import { bingo, bingoInfo, bingoMax, parseBingoInput, parseBingoOdds } from './bingo';
import { coinflip, parseCoinflipInput } from './coinflip';
import type { CoinflipInput } from './coinflip';
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
import { isRecord, MAX_MULTIPLIER } from './types';
import type { CoinflipOdds, Game } from './types';
import { parseWheelInput, parseWheelOdds, wheel, wheelInfo, wheelMax } from './wheel';
import { parseZeusInput, parseZeusOdds, zeus, zeusInfo, zeusMax } from './zeus';

export type InstantGame = 'coinflip' | 'plinko' | 'slots' | 'zeus' | 'wheel' | 'roulette' | 'bingo';

interface InstantEntry {
  parseInput(raw: unknown, odds: never): unknown;
  // The odds were parsed from the same config row, so each entry's own type holds.
  run: GameRunner<never, never, never>;
  info(odds: never): unknown;
  max(odds: never): number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const entry = <O, I, R extends Record<string, any>>(e: {
  parseInput: (raw: unknown, odds: O) => I;
  run: GameRunner<O, I, R>;
  info: (odds: O) => unknown;
  max: (odds: O) => number;
}) => e as unknown as InstantEntry;

export const instantGames: Record<InstantGame, InstantEntry> = {
  coinflip: entry({
    parseInput: parseCoinflipInput as (raw: unknown, odds: CoinflipOdds) => CoinflipInput,
    run: coinflip,
    info: () => ({}),
    max: (o: CoinflipOdds) => o.multiplier
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

function parseCoinflipOdds(raw: unknown): CoinflipOdds | null {
  if (!isRecord(raw)) return null;
  const { multiplier } = raw;
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier)) return null;
  const m = Math.round(multiplier * 100) / 100;
  if (m <= 1 || m > MAX_MULTIPLIER) return null;
  return { multiplier: m };
}

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
  coinflip: instantGames.coinflip.max,
  plinko: plinkoMax,
  slots: slotsMax,
  zeus: zeusMax,
  wheel: wheelMax,
  roulette: rouletteMax,
  bingo: bingoMax,
  poker: pokerMax
};
