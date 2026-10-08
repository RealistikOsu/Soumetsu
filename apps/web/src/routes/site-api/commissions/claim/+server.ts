import { bodyOf } from '$server/admin/common';
import { requireCaller } from '$server/auth';
import { claim } from '$server/commissions/service';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const { tier, day } = await bodyOf<{ tier: number; day?: string }>(request);
  return ok(await claim(caller.id, Number(tier), typeof day === 'string' ? day : undefined));
});
