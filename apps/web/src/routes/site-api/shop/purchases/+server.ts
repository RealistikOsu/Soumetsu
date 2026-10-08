import { requireCaller } from '$server/auth';
import { handle, ok } from '$server/respond';
import { purchasesFor } from '$server/shop/purchases';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await purchasesFor(caller.id));
});
