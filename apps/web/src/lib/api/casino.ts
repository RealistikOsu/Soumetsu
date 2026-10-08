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

interface GameLimits {
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
  siteApi.get<{ total: number; pageSize: number; rows: HistoryRow[] }>(
    '/casino/history',
    { page },
    signal
  );

export const playCoinflip = (bet: number, choice: 'heads' | 'tails') =>
  siteApi.post<CoinflipPlay>('/casino/play/coinflip', { bet, choice });

export type Risk = 'low' | 'medium' | 'high';
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Card = { suit: Suit; rank: number };
export type HandRank =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_of_a_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_of_a_kind'
  | 'two_pair'
  | 'jacks_or_better'
  | 'nothing';
export type BetType =
  | 'straight'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'dozen1'
  | 'dozen2'
  | 'dozen3'
  | 'col1'
  | 'col2'
  | 'col3';

export interface PlinkoInfo {
  rows: number[];
  tables: Record<Risk, Record<string, number[]>>;
}
export interface SlotsInfo {
  symbols: string[];
  multipliers: Record<string, number>;
  // A full column's multiplier per symbol, null where a column doesn't pay.
  columns: Record<string, number | null>;
}
export interface ZeusInfo {
  symbols: string[];
  multipliers: Record<string, number>;
  cols: number;
  rows: number;
}
export interface WheelInfo {
  segments: [string, number, 'multiplier' | 'penalty' | 'jackpot'][];
}
export interface RouletteInfo {
  red: number[];
  payouts: Record<BetType, number>;
}
export interface BingoInfo {
  maxCalls: number;
  lines: Record<string, number>;
}
export interface PokerInfo {
  payouts: Record<HandRank, number>;
}

export type PlinkoResult = { path: number[]; multiplier: number; payout: number };
export type SlotsResult = {
  grid: string[][];
  paylines: { line: string; symbol: string; multiplier: number }[];
  totalMultiplier: number;
  payout: number;
};
export type ZeusResult = {
  grid: string[][];
  wildPositions: number[][];
  wins: { symbol: string; count: number; multiplier: number }[];
  totalMultiplier: number;
  payout: number;
};
export type WheelResult = {
  segmentIndex: number;
  segment: { label: string; multiplier: number; type: 'multiplier' | 'penalty' | 'jackpot' };
  payout: number;
};
export type RouletteResult = {
  number: number;
  pocket: string;
  color: 'red' | 'black' | 'green';
  betType: BetType;
  betNumber: number | null;
  won: boolean;
  multiplier: number;
  payout: number;
};
export type BingoResult = {
  grid: (number | null)[][];
  called: number[];
  markedGrid: boolean[][];
  won: boolean;
  wonLines: string[];
  multiplier: number;
  payout: number;
};
type PokerResult = {
  hand: Card[];
  handRank: HandRank;
  multiplier: number;
  payout: number;
};

export interface GameInfo<I> {
  game: Game;
  minBet: number;
  maxBet: number;
  enabled: boolean;
  info: I | null;
  pending?: { hand: Card[]; bet: number } | null;
}

export interface PlayResponse<R> {
  result: R;
  payout: number;
  multiplier: number;
  balance: number;
}

export const gameInfo = <I>(game: Game, signal?: AbortSignal) =>
  siteApi.get<GameInfo<I>>(`/casino/games/${game}`, undefined, signal);

export const playGame = <R>(game: Game, body: Record<string, unknown>) =>
  siteApi.post<PlayResponse<R>>(`/casino/play/${game}`, body);

export const pokerDeal = (bet: number) =>
  siteApi.post<{ hand: Card[]; bet: number; balance: number }>('/casino/play/poker/deal', { bet });

export const pokerDraw = (held: boolean[]) =>
  siteApi.post<PlayResponse<PokerResult>>('/casino/play/poker/draw', { held });
