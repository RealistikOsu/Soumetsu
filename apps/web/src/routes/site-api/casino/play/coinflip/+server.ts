import { bodyOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { coinflip, parseCoinflipInput } from '$server/casino/games/coinflip';
import { play } from '$server/casino/play';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = await bodyOf<{ bet: unknown; choice: unknown }>(request);
  return ok(await play(caller.id, 'coinflip', body.bet, parseCoinflipInput(body), coinflip));
});
