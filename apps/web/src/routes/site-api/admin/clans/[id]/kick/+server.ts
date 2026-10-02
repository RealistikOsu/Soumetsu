import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request, params }) => {
  await requirePrivilege(request, Privilege.PanelManageClans);
  const body = await bodyOf<{ userId: number }>(request);
  const user = Number(body.userId);

  await db.user_clans.deleteMany({ where: { clan: Number(params.id), user } });
  await redis.publish('rosu:clan_update', String(user));
  return ok();
});
