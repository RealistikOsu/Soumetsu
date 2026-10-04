import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { pageOf } from '$server/admin/common';
import { playerReports } from '$server/admin/reports';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminManageReport);
  return ok(await playerReports(url.searchParams.get('all') !== '1', pageOf(url)));
});
