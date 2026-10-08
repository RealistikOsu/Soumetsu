import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { pageOf } from '$server/admin/common';
import { handle, ok } from '$server/respond';
import { purchasesPage } from '$server/shop/admin';

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(await purchasesPage(pageOf(url)));
});
