import { aviatorMax, parseAviatorOdds } from './aviator';
import { bingoMax, parseBingoOdds } from './bingo';
import { blackjackMax, parseBlackjackOdds } from './blackjack';
import { chickenMax, parseChickenOdds } from './chickenRoad';
import { coinflipMax, parseCoinflipOdds } from './coinflip';
import { minesMax, parseMinesOdds } from './mines';
import { parsePlinkoOdds, plinkoMax } from './plinko';
import { parsePokerOdds, pokerMax } from './poker';
import { parseRouletteOdds, rouletteMax } from './roulette';
import { parseSlotsOdds, slotsMax } from './slots';
import type { Game } from './types';
import { parseWheelOdds, wheelMax } from './wheel';
import { parseZeusOdds, zeusMax } from './zeus';

export const oddsParsers: Record<Game, (raw: unknown) => unknown | null> = {
  coinflip: parseCoinflipOdds,
  plinko: parsePlinkoOdds,
  slots: parseSlotsOdds,
  zeus: parseZeusOdds,
  wheel: parseWheelOdds,
  roulette: parseRouletteOdds,
  bingo: parseBingoOdds,
  poker: parsePokerOdds,
  mines: parseMinesOdds,
  chicken_road: parseChickenOdds,
  aviator: parseAviatorOdds,
  blackjack: parseBlackjackOdds
};

export const maxMultipliers: Partial<Record<Game, (odds: never) => number>> = {
  coinflip: coinflipMax,
  plinko: plinkoMax,
  slots: slotsMax,
  zeus: zeusMax,
  wheel: wheelMax,
  roulette: rouletteMax,
  bingo: bingoMax,
  poker: pokerMax,
  mines: minesMax,
  chicken_road: chickenMax,
  blackjack: blackjackMax,
  aviator: aviatorMax
};
