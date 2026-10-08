import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { templateInfo } from '$server/commissions/examples';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(templateInfo());
});
