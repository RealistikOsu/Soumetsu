import { requireCaller } from '$server/auth';
import { handle, ok } from '$server/respond';
import { shopFor } from '$server/shop/listing';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await shopFor(caller.id));
});
