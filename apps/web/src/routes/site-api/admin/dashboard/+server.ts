import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { counter, serverTotals } from '$server/admin/common';
import { db } from '$server/db';
import { latestPlays } from '$server/admin/plays';
import { handle, ok } from '$server/respond';

// The same figures the panel's dashboard showed, plus what needs a staff member's attention.
export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminAccessRap);
  const week = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  const [
    registered,
    totals,
    pending,
    oldest,
    frozen,
    soonest,
    restricted,
    latestRestriction,
    activity,
    latest
  ] = await Promise.all([
    counter('ripple:registered_users'),
    serverTotals(),
    db.rank_requests.count({ where: { blacklisted: false } }),
    db.rank_requests.findFirst({
      where: { blacklisted: false },
      orderBy: { id: 'asc' },
      select: { time: true }
    }),
    db.users.count({ where: { frozen: { not: 0 } } }),
    db.users.findFirst({
      where: { frozen: { not: 0 } },
      orderBy: { freezedate: 'asc' },
      select: { username: true, freezedate: true }
    }),
    db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM ban_logs WHERE UNIX_TIMESTAMP(ts) > ${week}`,
    db.$queryRaw<{ username: string; ts: number }[]>`
      SELECT u.username, UNIX_TIMESTAMP(b.ts) AS ts FROM ban_logs b INNER JOIN users u ON u.id = b.to_id
      ORDER BY b.id DESC LIMIT 1`,
    db.$queryRaw<
      { id: number; userid: number; username: string | null; text: string; datetime: number }[]
    >`
      SELECT l.id, l.userid, u.username, l.text, l.datetime FROM rap_logs l
      LEFT JOIN users u ON u.id = l.userid ORDER BY l.id DESC LIMIT 8`,
    latestPlays(21, 0)
  ]);

  return ok({
    counters: { registered, ...totals },
    pendingRequests: { total: pending, oldest: oldest?.time ?? null },
    frozen: { total: frozen, soonest: soonest ?? null },
    restrictions: {
      week: Number(restricted[0]?.total ?? 0),
      latest: latestRestriction[0]
        ? { ...latestRestriction[0], ts: Number(latestRestriction[0].ts) }
        : null
    },
    activity,
    latest
  });
});
