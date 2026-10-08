import { requireCaller } from '$server/auth';
import { unreadTotal } from '$server/messages';
import { touchPresence } from '$server/presence';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const [unread] = await Promise.all([unreadTotal(caller.id), touchPresence(caller.id)]);
  return ok(unread);
});
