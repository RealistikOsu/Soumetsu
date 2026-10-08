import { siteApi } from './client';

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

export interface GameLimits {
  game: Game;
  minBet: number;
  maxBet: number;
  enabled: boolean;
}

export interface CasinoView {
  balance: number;
  supporter: boolean;
  restricted: boolean;
  games: GameLimits[];
}

export interface HistoryRow {
  id: number;
  game: Game;
  bet: number;
  multiplier: number;
  payout: number;
  net: number;
  playedAt: string;
  result: unknown;
}

export interface CoinflipPlay {
  result: { outcome: 'heads' | 'tails'; choice: 'heads' | 'tails'; won: boolean };
  payout: number;
  multiplier: number;
  balance: number;
}

export const casino = (signal?: AbortSignal) =>
  siteApi.get<CasinoView>('/casino', undefined, signal);

export const casinoBalance = (signal?: AbortSignal) =>
  siteApi.get<{ balance: number }>('/casino/balance', undefined, signal);

export const casinoHistory = (page: number, signal?: AbortSignal) =>
  siteApi.get<{ total: number; rows: HistoryRow[] }>('/casino/history', { page }, signal);

export const playCoinflip = (bet: number, choice: 'heads' | 'tails') =>
  siteApi.post<CoinflipPlay>('/casino/play/coinflip', { bet, choice });
