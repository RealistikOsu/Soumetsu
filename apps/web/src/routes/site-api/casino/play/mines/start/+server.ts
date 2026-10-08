import { bodyOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { start } from '$server/casino/mines';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = await bodyOf<{ bet: unknown; mines: unknown }>(request);
  return ok(await start(caller.id, body));
});
