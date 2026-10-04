import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { idOf } from '$server/admin/common';
import { resolvePlayerReport } from '$server/admin/reports';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageReport);
  await resolvePlayerReport(caller.id, idOf(params));
  return ok();
});
