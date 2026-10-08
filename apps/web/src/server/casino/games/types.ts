export type Game =
  | 'coinflip'
  | 'plinko'
  | 'slots'
  | 'roulette'
  | 'wheel'
  | 'bingo'
  | 'chicken_road'
  | 'aviator'
  | 'mines'
  | 'poker'
  | 'zeus'
  | 'blackjack';

export const GAMES: readonly Game[] = [
  'coinflip',
  'plinko',
  'slots',
  'roulette',
  'wheel',
  'bingo',
  'chicken_road',
  'aviator',
  'mines',
  'poker',
  'zeus',
  'blackjack'
];

export interface CoinflipOdds {
  multiplier: number;
}

export interface GameConfig<O = unknown> {
  game: Game;
  minBet: number;
  maxBet: number;
  enabled: boolean;
  odds: O | null;
}

// casino_game_history.multiplier is DECIMAL(6,2), so payouts use the multiplier as it will be stored.
export const payoutFor = (bet: number, multiplier: number) =>
  Math.floor((bet * Math.round(multiplier * 100)) / 100);
