import { pageOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { historyFor } from '$server/casino/history';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, url }) => {
  const caller = await requireCaller(request);
  return ok(await historyFor(caller.id, pageOf(url)));
});
