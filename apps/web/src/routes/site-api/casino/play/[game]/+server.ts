import { bodyOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { gameConfig } from '$server/casino/config';
import type { Game } from '$server/casino/config';
import { instantEntry } from '$server/casino/routes';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const entry = instantEntry(params.game!);
  const body = await bodyOf<{ bet: unknown }>(request);
  const cfg = await gameConfig(params.game as Game);
  if (!cfg.enabled || cfg.odds === null) throw new Failure(403, 'casino.disabled');
  // Parsed before play() so a malformed body never counts against the rate limit.
  const run = entry.prepare(body, cfg);
  return ok(await run(caller.id, params.game as Game, body.bet));
});
