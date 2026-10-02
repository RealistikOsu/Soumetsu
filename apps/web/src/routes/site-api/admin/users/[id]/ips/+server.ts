import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { idOf } from '$server/admin/common';
import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { handle, ok } from '$server/respond';

// Every account that shares an address with this one, the address they share and how often it was seen.
export const GET = handle(async ({ request, params }) => {
  await requirePrivilege(request, Privilege.PanelViewIps);
  const id = idOf(params);

  const own = await db.ip_user.findMany({
    where: { userid: id, ip: { not: '' } },
    select: { ip: true }
  });
  if (!own.length) return ok([]);

  const rows = await db.$queryRaw<
    { userid: number; ip: string; occurencies: number; username: string; privileges: bigint }[]
  >`SELECT i.userid, i.ip, i.occurencies, u.username, u.privileges
    FROM ip_user i INNER JOIN users u ON u.id = i.userid
    WHERE i.ip IN (${Prisma.join(own.map((o) => o.ip))}) ORDER BY i.ip DESC`;
  return ok(rows.map((row) => ({ ...row, privileges: Number(row.privileges) })));
});
