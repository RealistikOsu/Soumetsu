import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { handle, ok } from '$server/respond';
import { listItems, updateItem } from '$server/shop/admin';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(await listItems());
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageSetting);
  await updateItem(caller.id, await bodyOf<Record<string, unknown>>(request));
  return ok();
});
