import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { latestPlays } from '$server/admin/plays';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

const DAY = 86400;

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminAccessRap);
  const minPp = Math.max(0, Number(url.searchParams.get('minpp')) || 0);
  const now = Math.floor(Date.now() / 1000);

  const days = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const end = now - (6 - i) * DAY;
      return db.users
        .count({ where: { register_datetime: { gt: end - DAY, lt: end } } })
        .then((registered) => ({ end, registered }));
    })
  );

  const [active, restricted, plays] = await Promise.all([
    db.users.count({ where: { latest_activity: { gt: now - DAY } } }),
    db.users.count({ where: { privileges: { in: [0, 2] } } }),
    latestPlays(300, minPp)
  ]);

  return ok({ days, active, restricted, plays: plays.slice(0, 100) });
});
