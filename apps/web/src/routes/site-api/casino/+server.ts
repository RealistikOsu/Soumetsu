import { isPublic, isSupporter } from '$lib/auth/privileges';
import { requireCaller } from '$server/auth';
import { db } from '$server/db';
import { publicConfig } from '$server/casino/config';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const [user, games] = await Promise.all([
    db.users.findUnique({ where: { id: caller.id }, select: { coins: true, privileges: true } }),
    publicConfig()
  ]);
  const privileges = Number(user?.privileges ?? 0);
  return ok({
    balance: user?.coins ?? 0,
    supporter: isSupporter(privileges),
    restricted: !isPublic(privileges),
    games
  });
});
