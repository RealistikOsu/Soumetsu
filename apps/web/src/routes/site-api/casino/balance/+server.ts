import { requireCaller } from '$server/auth';
import { balanceOf } from '$server/casino/balance';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok({ balance: await balanceOf(caller.id) });
});
