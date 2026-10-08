import { getToken } from '$lib/auth/token';
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

export interface GameInfo<I, P = { hand: Card[]; bet: number }> {
  game: Game;
  minBet: number;
  maxBet: number;
  enabled: boolean;
  info: I | null;
  pending?: P | null;
}

export interface PlayResponse<R> {
  result: R;
  payout: number;
  multiplier: number;
  balance: number;
}

export const gameInfo = <I, P = { hand: Card[]; bet: number }>(game: Game, signal?: AbortSignal) =>
  siteApi.get<GameInfo<I, P>>(`/casino/games/${game}`, undefined, signal);

export const playGame = <R>(game: Game, body: Record<string, unknown>) =>
  siteApi.post<PlayResponse<R>>(`/casino/play/${game}`, body);

export const pokerDeal = (bet: number) =>
  siteApi.post<{ hand: Card[]; bet: number; balance: number }>('/casino/play/poker/deal', { bet });

export const pokerDraw = (held: boolean[]) =>
  siteApi.post<PlayResponse<PokerResult>>('/casino/play/poker/draw', { held });

export interface MinesInfo {
  grid: number;
}
export interface ChickenInfo {
  multipliers: number[];
}
export interface BlackjackInfo {
  blackjack: number;
  win: number;
}
export interface AviatorCurve {
  rate: number;
  power: number;
}
export interface AviatorInfo {
  curve: AviatorCurve;
}

export interface MinesView {
  bet: number;
  count: number;
  revealed: number[];
  multiplier: number;
  next: number | null;
}
export type MinesResult = {
  mines: number[];
  revealed: number[];
  hit: number | null;
  cashedOut: boolean;
};
export interface ChickenView {
  bet: number;
  step: number;
  multiplier: number;
  next: number | null;
}
export type ChickenResult = { steps: number; crashedAt?: number };
export type BlackjackOutcome = 'blackjack' | 'win' | 'dealer_bust' | 'lose' | 'bust';
export interface BlackjackView {
  bet: number;
  player: Card[];
  playerScore: number;
  dealer: Card[];
  dealerScore: number;
  canDouble: boolean;
}
export type BlackjackResult = {
  player: Card[];
  dealer: Card[];
  playerScore: number;
  dealerScore: number;
  outcome: BlackjackOutcome;
};
export interface AviatorView {
  bet: number;
  startedAt: number;
  curve: AviatorCurve;
}
export type AviatorResult = { crashPoint: number; cashOutAt: number | null; won: boolean };

// A step keeps the game going; the last one settles it and carries the result.
export type Step<V, R> =
  | { view: V; balance?: number }
  | { view: V; result: R; payout: number; multiplier: number; balance: number };
export type Started<V> = { view: V; balance: number };
export type Settled<V, R> = Extract<Step<V, R>, { result: R }>;

export const isSettled = <V, R>(step: Step<V, R>): step is Settled<V, R> => 'result' in step;

export const minesStart = (bet: number, mines: number) =>
  siteApi.post<Started<MinesView>>('/casino/play/mines/start', { bet, mines });
export const minesReveal = (tile: number) =>
  siteApi.post<Step<MinesView, MinesResult>>('/casino/play/mines/reveal', { tile });
export const minesCashout = () =>
  siteApi.post<Settled<MinesView, MinesResult>>('/casino/play/mines/cashout');

export const chickenStart = (bet: number) =>
  siteApi.post<Started<ChickenView>>('/casino/play/chicken-road/start', { bet });
export const chickenStep = () =>
  siteApi.post<Step<ChickenView, ChickenResult>>('/casino/play/chicken-road/step');
export const chickenCashout = () =>
  siteApi.post<Settled<ChickenView, ChickenResult>>('/casino/play/chicken-road/cashout');

export const blackjackStart = (bet: number) =>
  siteApi.post<Step<BlackjackView, BlackjackResult> & { balance: number }>(
    '/casino/play/blackjack/start',
    { bet }
  );
export const blackjackHit = () =>
  siteApi.post<Step<BlackjackView, BlackjackResult>>('/casino/play/blackjack/hit');
export const blackjackStand = () =>
  siteApi.post<Settled<BlackjackView, BlackjackResult>>('/casino/play/blackjack/stand');
export const blackjackDouble = () =>
  siteApi.post<Settled<BlackjackView, BlackjackResult>>('/casino/play/blackjack/double');

export const aviatorStart = (bet: number) =>
  siteApi.post<Started<AviatorView>>('/casino/play/aviator/start', { bet });
export const aviatorCashout = () =>
  siteApi.post<Settled<AviatorView, AviatorResult>>('/casino/play/aviator/cashout');

export type AviatorEvent =
  | { type: 'tick'; m: number }
  | { type: 'crash'; crashPoint: number; balance: number }
  | { type: 'done' };

// Ends when the stream does; the page decides whether to open another.
export async function aviatorStream(onEvent: (event: AviatorEvent) => void, signal: AbortSignal) {
  const response = await fetch('/site-api/casino/play/aviator/stream', {
    headers: { Authorization: `Bearer ${getToken()}` },
    signal
  });
  if (!response.ok || !response.body) throw new Error(`stream ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    const events = (buffer + value).split('\n\n');
    buffer = events.pop()!;
    for (const event of events) {
      if (event.startsWith('data: ')) onEvent(JSON.parse(event.slice(6)) as AviatorEvent);
    }
  }
}
