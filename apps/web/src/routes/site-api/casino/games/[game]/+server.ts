import { requireCaller } from '$server/auth';
import type { Game } from '$server/casino/config';
import { gameConfig } from '$server/casino/config';
import { pendingFlight } from '$server/casino/aviator';
import { pendingHand } from '$server/casino/blackjack';
import { pending as pendingChicken } from '$server/casino/chickenRoad';
import { aviatorInfo } from '$server/casino/games/aviator';
import type { AviatorOdds } from '$server/casino/games/aviator';
import { blackjackInfo } from '$server/casino/games/blackjack';
import type { BlackjackOdds } from '$server/casino/games/blackjack';
import { chickenInfo } from '$server/casino/games/chickenRoad';
import type { ChickenOdds } from '$server/casino/games/chickenRoad';
import { minesInfo } from '$server/casino/games/mines';
import type { MinesOdds } from '$server/casino/games/mines';
import { pokerInfo } from '$server/casino/games/poker';
import type { PokerOdds } from '$server/casino/games/poker';
import { pending as pendingMines } from '$server/casino/mines';
import { pending } from '$server/casino/poker';
import { instantEntry } from '$server/casino/routes';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const game = params.game!;

  async function withPending<O>(
    key: Game,
    infoOf: (odds: O) => unknown,
    pendingOf: (userId: number) => Promise<unknown>
  ) {
    const cfg = await gameConfig<O>(key);
    const { odds } = cfg;
    return {
      game: key,
      minBet: cfg.minBet,
      maxBet: cfg.maxBet,
      enabled: cfg.enabled && odds !== null,
      info: odds && infoOf(odds),
      pending: await pendingOf(caller.id)
    };
  }

  const stateful: Record<string, () => Promise<unknown>> = {
    poker: () => withPending<PokerOdds>('poker', pokerInfo, pending),
    mines: () => withPending<MinesOdds>('mines', minesInfo, pendingMines),
    chicken_road: () => withPending<ChickenOdds>('chicken_road', chickenInfo, pendingChicken),
    blackjack: () => withPending<BlackjackOdds>('blackjack', blackjackInfo, pendingHand),
    aviator: () =>
      withPending<AviatorOdds>('aviator', aviatorInfo, (id) => pendingFlight(id, Date.now()))
  };

  if (Object.hasOwn(stateful, game)) return ok(await stateful[game]());

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
