import { db } from '$server/db';
import { Failure } from '$server/respond';
import { PAGE_SIZE } from './common';
import { rapLog } from './log';

// Player reports, from bancho's !report (which saves the reported player's recent chat) and from profiles here.
export async function playerReports(open: boolean, page: number) {
  const where = open ? 'WHERE r.resolved_at IS NULL' : '';
  const [rows, total] = await Promise.all([
    db.$queryRawUnsafe<
      {
        id: number;
        from_uid: number;
        from_name: string | null;
        to_uid: number;
        to_name: string | null;
        reason: string;
        chatlog: string;
        time: number;
        resolved_at: number | null;
        resolved_name: string | null;
      }[]
    >(
      `SELECT r.id, r.from_uid, f.username AS from_name, r.to_uid, t.username AS to_name, r.reason,
              r.chatlog, r.time, r.resolved_at, s.username AS resolved_name
       FROM reports r
       LEFT JOIN users f ON f.id = r.from_uid
       LEFT JOIN users t ON t.id = r.to_uid
       LEFT JOIN users s ON s.id = r.resolved_by
       ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      PAGE_SIZE,
      (page - 1) * PAGE_SIZE
    ),
    db.$queryRawUnsafe<{ total: bigint }[]>(`SELECT COUNT(*) AS total FROM reports r ${where}`)
  ]);
  return { pages: Math.ceil(Number(total[0].total) / PAGE_SIZE), rows };
}

export async function resolvePlayerReport(staffId: number, reportId: number) {
  const resolved = await db.$executeRaw`
    UPDATE reports SET resolved_by = ${staffId}, resolved_at = ${Math.floor(Date.now() / 1000)}
    WHERE id = ${reportId} AND resolved_at IS NULL`;
  if (!resolved) throw new Failure(404, 'site.invalid_request');
  await rapLog(staffId, `has resolved player report #${reportId}`);
}
