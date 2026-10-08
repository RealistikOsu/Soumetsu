import { requireCaller } from '$server/auth';
import { todayFor } from '$server/commissions/service';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await todayFor(caller.id));
});
