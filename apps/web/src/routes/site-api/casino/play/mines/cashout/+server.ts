import { requireCaller } from '$server/auth';
import { cashout } from '$server/casino/mines';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await cashout(caller.id));
});
