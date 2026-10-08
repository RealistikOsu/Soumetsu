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

export const MAX_MULTIPLIER = 9999.99;

export const toHundredths = (n: number) => Math.round(n * 100) / 100;

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export const isAmount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;

export interface SymbolOdds {
  symbols: string[];
  weights: Record<string, number>;
  multipliers: Record<string, number>;
}

export function parseSymbolOdds(raw: Record<string, unknown>): SymbolOdds | null {
  const { symbols, weights, multipliers } = raw;
  if (!Array.isArray(symbols) || symbols.length === 0) return null;
  if (!symbols.every((s) => typeof s === 'string' && s !== '')) return null;
  if (new Set(symbols).size !== symbols.length) return null;
  if (!isRecord(weights) || !isRecord(multipliers)) return null;

  const outWeights: Record<string, number> = {};
  const outMultipliers: Record<string, number> = {};
  for (const symbol of symbols as string[]) {
    const weight = weights[symbol];
    const multiplier = multipliers[symbol];
    if (!isAmount(weight) || !isAmount(multiplier) || multiplier > MAX_MULTIPLIER) return null;
    outWeights[symbol] = weight;
    outMultipliers[symbol] = multiplier;
  }
  if (Object.values(outWeights).reduce((a, b) => a + b, 0) <= 0) return null;
  return { symbols: symbols as string[], weights: outWeights, multipliers: outMultipliers };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickWeighted({ symbols, weights }: SymbolOdds, rng: () => number): string {
  let rand = rng() * symbols.reduce((sum, s) => sum + weights[s], 0);
  for (const symbol of symbols) {
    rand -= weights[symbol];
    if (rand <= 0) return symbol;
  }
  return symbols[0];
}
