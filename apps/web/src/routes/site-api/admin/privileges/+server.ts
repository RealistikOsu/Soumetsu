import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { colourOf, parseGroup } from '$server/admin/groups';
import type { GroupBody } from '$server/admin/groups';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  const groups = await db.privileges_groups.findMany({ orderBy: { id: 'asc' } });
  return ok(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      privileges: Number(g.privileges),
      colour: g.color,
      tone: colourOf(g.color)
    }))
  );
});

export const POST = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManagePrivilege);
  const data = parseGroup(await bodyOf<GroupBody>(request));

  const group = await db.privileges_groups.create({ data });
  await rapLog(caller.id, `Created a new privilege group with the ID of ${group.id}`);
  return ok({ id: group.id });
});
