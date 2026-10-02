import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { parseGroup } from '$server/admin/groups';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

export const PUT = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManagePrivilege);
  const id = Number(params.id);
  const data = parseGroup(await bodyOf(request));

  const { count } = await db.privileges_groups.updateMany({ where: { id }, data });
  if (!count) throw new Failure(404, 'Privilege group not found.');
  await rapLog(caller.id, `has edited the privilege group ${data.name} (${id})`);
  return ok();
});

export const DELETE = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManagePrivilege);
  const id = Number(params.id);
  const group = await db.privileges_groups.findUnique({ where: { id } });
  if (!group) throw new Failure(404, 'Privilege group not found.');

  await db.privileges_groups.delete({ where: { id } });
  await rapLog(caller.id, `deleted the privilege ${group.name} (${id})`);
  return ok();
});
