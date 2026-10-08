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
