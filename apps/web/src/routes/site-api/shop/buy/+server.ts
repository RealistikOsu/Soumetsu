import { requireCaller } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { Failure, handle, ok } from '$server/respond';
import { buy } from '$server/shop/buy';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = await bodyOf<{ item: unknown; metadata: unknown }>(request);
  const metadata = body.metadata ?? {};
  if (
    (typeof body.item !== 'number' && typeof body.item !== 'string') ||
    typeof metadata !== 'object' ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    throw new Failure(400, 'site.invalid_request');
  }
  return ok(await buy(caller.id, body.item, metadata as Record<string, unknown>));
});
