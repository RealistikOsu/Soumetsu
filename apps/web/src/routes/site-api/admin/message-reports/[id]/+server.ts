import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { idOf } from '$server/admin/common';
import { reportedConversation, resolveReport } from '$server/admin/messages';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageReport);
  return ok(await reportedConversation(caller.id, idOf(params)));
});

export const POST = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageReport);
  await resolveReport(caller.id, idOf(params));
  return ok();
});
