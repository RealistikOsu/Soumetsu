import { requireCaller } from '$server/auth';
import { conversations } from '$server/messages';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await conversations(caller.id));
});
