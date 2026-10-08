import { bingoMax, parseBingoOdds } from './bingo';
import { coinflipMax, parseCoinflipOdds } from './coinflip';
import { parsePlinkoOdds, plinkoMax } from './plinko';
import { parsePokerOdds, pokerMax } from './poker';
import { parseRouletteOdds, rouletteMax } from './roulette';
import { parseSlotsOdds, slotsMax } from './slots';
import type { Game } from './types';
import { parseWheelOdds, wheelMax } from './wheel';
import { parseZeusOdds, zeusMax } from './zeus';

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
