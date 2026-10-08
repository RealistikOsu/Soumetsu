import { bodyOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { draw } from '$server/casino/poker';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = await bodyOf<{ held: unknown }>(request);
  return ok(await draw(caller.id, body.held));
});
