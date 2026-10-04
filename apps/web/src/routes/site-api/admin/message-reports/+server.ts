import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { openReports } from '$server/admin/messages';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageReport);
  return ok(await openReports());
});
