import { requireCaller } from '$server/auth';
import type { Game } from '$server/casino/config';
import { gameConfig } from '$server/casino/config';
import { pokerInfo } from '$server/casino/games/poker';
import type { PokerOdds } from '$server/casino/games/poker';
import { pending } from '$server/casino/poker';
import { instantEntry } from '$server/casino/routes';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const game = params.game!;

  if (game === 'poker') {
    const cfg = await gameConfig<PokerOdds>('poker');
    const { odds } = cfg;
    return ok({
      game,
      minBet: cfg.minBet,
      maxBet: cfg.maxBet,
      enabled: cfg.enabled && odds !== null,
      info: odds && pokerInfo(odds),
      pending: await pending(caller.id)
    });
  }

  const entry = instantEntry(game);
  const cfg = await gameConfig(game as Game);
  return ok({
    game,
    minBet: cfg.minBet,
    maxBet: cfg.maxBet,
    enabled: cfg.enabled && cfg.odds !== null,
    info: cfg.odds ? entry.info(cfg.odds) : null
  });
});
