import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, pageOf } from '$server/admin/common';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

interface Row {
  id: number;
  userid: number;
  username: string | null;
  text: string;
  datetime: number;
  through: string;
}

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminViewRapLogs);
  const page = pageOf(url);
  const like = `%${(url.searchParams.get('q') ?? '').trim()}%`;

  const where = `WHERE l.text LIKE ? OR u.username LIKE ?`;
  const [rows, total] = await Promise.all([
    db.$queryRawUnsafe<Row[]>(
      `SELECT l.id, l.userid, u.username, l.text, l.datetime, l.through FROM rap_logs l
       LEFT JOIN users u ON u.id = l.userid ${where}
       ORDER BY l.id DESC LIMIT ? OFFSET ?`,
      like,
      like,
      PAGE_SIZE,
      (page - 1) * PAGE_SIZE
    ),
    db.$queryRawUnsafe<{ total: bigint }[]>(
      `SELECT COUNT(*) AS total FROM rap_logs l LEFT JOIN users u ON u.id = l.userid ${where}`,
      like,
      like
    )
  ]);

  return ok({ pages: Math.ceil(Number(total[0].total) / PAGE_SIZE), rows });
});
