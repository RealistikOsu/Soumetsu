import { bodyOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { deal } from '$server/casino/poker';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = await bodyOf<{ bet: unknown }>(request);
  return ok(await deal(caller.id, body.bet));
});
