import { requireCaller } from '$server/auth';
import { isReportReason, reportUser } from '$server/reports';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const target = Number(params.id);
  const body = (await request.json().catch(() => null)) as {
    reason?: unknown;
    info?: unknown;
  } | null;
  const reason = body?.reason;
  const info = typeof body?.info === 'string' ? body.info.trim() : '';
  if (!Number.isInteger(target) || !isReportReason(reason) || info.length > 500) {
    throw new Failure(400, 'site.invalid_request');
  }
  await reportUser(caller.id, target, reason, info);
  return ok();
});
