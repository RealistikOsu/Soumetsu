import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, pageOf } from '$server/admin/common';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminViewRapLogs);
  const page = pageOf(url);

  const [rows, total] = await Promise.all([
    db.$queryRaw<
      {
        from_id: number;
        from_name: string;
        to_id: number;
        to_name: string;
        ts: number;
        summary: string;
        detail: string;
      }[]
    >`SELECT b.from_id, f.username AS from_name, b.to_id, t.username AS to_name,
             UNIX_TIMESTAMP(b.ts) AS ts, b.summary, b.detail
      FROM ban_logs b
      INNER JOIN users f ON f.id = b.from_id
      INNER JOIN users t ON t.id = b.to_id
      ORDER BY b.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    db.ban_logs.count()
  ]);

  return ok({
    pages: Math.ceil(total / PAGE_SIZE),
    rows: rows.map((row) => ({ ...row, ts: Number(row.ts) }))
  });
});
