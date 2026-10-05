import { requireCaller } from '$server/auth';
import { idOf } from '$server/admin/common';
import { handle, ok } from '$server/respond';
import { withdraw } from '$server/uploads';

export const DELETE = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  await withdraw(caller.id, idOf(params));
  return ok();
});
