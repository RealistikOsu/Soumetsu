import { requireCaller } from '$server/auth';
import { report } from '$server/messages';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as {
    message?: unknown;
    reason?: unknown;
  } | null;
  const message = body?.message;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (typeof message !== 'number' || !Number.isInteger(message) || !reason || reason.length > 255) {
    throw new Failure(400, 'site.invalid_request');
  }
  await report(caller.id, message, reason);
  return ok();
});
