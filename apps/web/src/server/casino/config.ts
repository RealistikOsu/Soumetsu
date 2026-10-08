import { isSupporter } from '$lib/auth/privileges';
import { db } from '$server/db';
import { oddsParsers } from './games/odds';
import { GAMES } from './games/types';
import type { CoinflipOdds, Game, GameConfig } from './games/types';

export { GAMES };
export type { CoinflipOdds, Game, GameConfig };

const TTL_MS = 60_000;

const cache: Partial<Record<Game, { value: GameConfig; at: number }>> = {};

export const parseOdds = (game: Game, raw: unknown): unknown | null => oddsParsers[game](raw);

export async function gameConfig<O>(game: Game): Promise<GameConfig<O>> {
  const hit = cache[game];
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as GameConfig<O>;

  const row = await db.casino_game_config.findUnique({ where: { game_type: game } });
  const value: GameConfig = row
    ? {
        game,
        minBet: row.min_bet,
        maxBet: row.max_bet,
        enabled: row.enabled,
        odds: parseOdds(game, row.config_json)
      }
    : { game, minBet: 1, maxBet: 5000, enabled: false, odds: null };
  cache[game] = { value, at: Date.now() };
  return value as GameConfig<O>;
}

// Odds stay on the server, so the client only ever sees limits and the on/off switch.
export async function publicConfig() {
  return Promise.all(
    GAMES.map(async (game) => {
      const { minBet, maxBet, enabled, odds } = await gameConfig(game);
      return { game, minBet, maxBet, enabled: enabled && odds !== null };
    })
  );
}

export function clearConfigCache() {
  for (const game of GAMES) delete cache[game];
}

export const donorBuff = (payout: number, privileges: number) =>
  payout > 0 && isSupporter(privileges) ? Math.floor((payout * 11) / 10) : payout;
