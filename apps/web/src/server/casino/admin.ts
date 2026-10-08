import type { Prisma } from '$server/generated/client';
import { db } from '$server/db';
import { rapLog } from '$server/admin/log';
import { Failure } from '$server/respond';
import { clearConfigCache, GAMES, parseOdds } from './config';
import type { CoinflipOdds, Game } from './config';

const MAX_BET = 1_000_000;

export interface CasinoConfigRow {
  game: Game;
  minBet: number;
  maxBet: number;
  enabled: boolean;
  odds: unknown;
}

export async function casinoConfigRows(): Promise<CasinoConfigRow[]> {
  const found = await db.casino_game_config.findMany();
  return GAMES.map((game) => {
    const row = found.find((r) => r.game_type === game);
    return row
      ? {
          game,
          minBet: row.min_bet,
          maxBet: row.max_bet,
          enabled: row.enabled,
          odds: row.config_json
        }
      : { game, minBet: 1, maxBet: 5000, enabled: false, odds: null };
  });
}

const INT_MAX = 2_147_483_647;

// Worst-case payout for one bet, with the supporter buff, which has to fit the
// signed 32-bit coin columns.
function maxPayout(game: Game, odds: unknown, maxBet: number) {
  if (game === 'coinflip')
    return Math.floor((maxBet * (odds as CoinflipOdds).multiplier * 11) / 10);
  return 0;
}

export function parseConfigRow(raw: unknown) {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const { game, minBet, maxBet, enabled } = input;
  if (typeof game !== 'string' || !(GAMES as readonly string[]).includes(game))
    throw new Failure(400, 'site.invalid_request');
  if (
    typeof minBet !== 'number' ||
    typeof maxBet !== 'number' ||
    !Number.isInteger(minBet) ||
    !Number.isInteger(maxBet) ||
    minBet < 1 ||
    maxBet < minBet ||
    maxBet > MAX_BET ||
    typeof enabled !== 'boolean'
  )
    throw new Failure(400, 'site.invalid_request');
  const odds = parseOdds(game as Game, input.odds);
  if (odds === null || maxPayout(game as Game, odds, maxBet) > INT_MAX)
    throw new Failure(400, 'site.invalid_request');
  return { game: game as Game, minBet, maxBet, enabled, odds };
}

export async function saveCasinoConfig(staffId: number, raw: unknown) {
  const { game, minBet, maxBet, enabled, odds } = parseConfigRow(raw);

  const data = {
    min_bet: minBet,
    max_bet: maxBet,
    enabled,
    config_json: odds as Prisma.InputJsonValue,
    updated_at: new Date()
  };
  await db.casino_game_config.upsert({
    where: { game_type: game },
    create: { game_type: game, ...data },
    update: data
  });
  clearConfigCache();
  await rapLog(staffId, `updated the casino settings for ${game}`);
}
