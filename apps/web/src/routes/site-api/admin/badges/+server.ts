import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(await db.badges.findMany({ orderBy: { id: 'asc' } }));
});

export const POST = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBadges);
  const body = await bodyOf<{ name: string; icon: string }>(request);
  const name = (body.name ?? '').trim();
  if (!name) throw new Failure(400, 'auth.validation_error');

  const badge = await db.badges.create({ data: { name, icon: (body.icon ?? '').trim() } });
  await rapLog(caller.id, `Created a badge with the ID of ${badge.id}`);
  return ok(badge);
});
