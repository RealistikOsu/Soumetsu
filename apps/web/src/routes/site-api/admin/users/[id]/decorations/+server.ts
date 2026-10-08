import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf, idOf } from '$server/admin/common';
import { handle, ok } from '$server/respond';
import { grantDecoration, revokeDecoration } from '$server/shop/admin';

export const POST = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageUsers);
  const body = await bodyOf<{ key: unknown }>(request);
  await grantDecoration(caller.id, idOf(params), body.key);
  return ok();
});

export const DELETE = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageUsers);
  const body = await bodyOf<{ key: unknown }>(request);
  await revokeDecoration(caller.id, idOf(params), body.key);
  return ok();
});
