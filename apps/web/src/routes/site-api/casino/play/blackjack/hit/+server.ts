import { requireCaller } from '$server/auth';
import { hit } from '$server/casino/blackjack';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await hit(caller.id));
});
