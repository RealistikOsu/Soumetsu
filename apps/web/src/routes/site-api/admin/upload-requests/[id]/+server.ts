import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf, idOf } from '$server/admin/common';
import { Failure, handle, ok } from '$server/respond';
import { STATUSES, review, type Status } from '$server/uploads';

export const POST = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminAccessRap);
  const { status } = await bodyOf<{ status: Status }>(request);
  if (!status || !STATUSES.includes(status)) throw new Failure(400, 'site.invalid_request');
  await review(caller.id, idOf(params), status);
  return ok();
});
