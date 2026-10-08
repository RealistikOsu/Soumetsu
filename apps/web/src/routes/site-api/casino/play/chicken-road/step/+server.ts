import { requireCaller } from '$server/auth';
import { advance } from '$server/casino/chickenRoad';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await advance(caller.id));
});
