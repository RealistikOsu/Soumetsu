import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params }) => {
  await requirePrivilege(request, Privilege.PanelViewIps);
  const ip = params.ip ?? '';

  const rows = await db.$queryRaw<
    { userid: number; ip: string; occurencies: number; username: string }[]
  >`SELECT i.userid, i.ip, i.occurencies, u.username
    FROM ip_user i INNER JOIN users u ON u.id = i.userid WHERE i.ip = ${ip}`;
  return ok(rows);
});
