import { bodyOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { reveal } from '$server/casino/mines';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = await bodyOf<{ tile: unknown }>(request);
  return ok(await reveal(caller.id, body.tile));
});
