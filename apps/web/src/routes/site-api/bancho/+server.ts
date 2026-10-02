import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const link = await db.osu_official_links.findUnique({ where: { osu_user_id: caller.id } });
  return ok({
    configured: !!(config.osu.id && config.osu.secret),
    link: link ? { id: Number(link.ppy_user_id), username: link.ppy_username } : null
  });
});

export const DELETE = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const removed = await db.osu_official_links.deleteMany({ where: { osu_user_id: caller.id } });
  if (removed.count === 0) throw new Failure(404, 'site.not_linked');
  return ok();
});
