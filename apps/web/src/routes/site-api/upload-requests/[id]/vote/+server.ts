import { requireCaller } from '$server/auth';
import { idOf } from '$server/admin/common';
import { Failure, handle, ok } from '$server/respond';
import { vote } from '$server/uploads';

export const PUT = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as { vote?: unknown } | null;
  if (body?.vote !== -1 && body?.vote !== 0 && body?.vote !== 1) {
    throw new Failure(400, 'site.invalid_request');
  }
  return ok(await vote(caller.id, idOf(params), body.vote));
});
