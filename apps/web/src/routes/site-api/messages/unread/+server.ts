import { requireCaller } from '$server/auth';
import { unreadTotal } from '$server/messages';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await unreadTotal(caller.id));
});
