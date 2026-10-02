import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

export const PUT = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBadges);
  const id = Number(params.id);
  const body = await bodyOf<{ name: string; icon: string }>(request);
  const name = (body.name ?? '').trim();
  if (!name) throw new Failure(400, 'auth.validation_error');

  const { count } = await db.badges.updateMany({
    where: { id },
    data: { name, icon: (body.icon ?? '').trim() }
  });
  if (!count) throw new Failure(404, 'Badge not found.');
  await rapLog(caller.id, `edited the badge with the ID of ${id}`);
  return ok();
});

// Deleting a badge also takes it off everyone who had it.
export const DELETE = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBadges);
  const id = Number(params.id);
  await db.badges.deleteMany({ where: { id } });
  await db.user_badges.deleteMany({ where: { badge: id } });
  await rapLog(caller.id, `deleted the badge with the ID of ${id}`);
  return ok();
});
