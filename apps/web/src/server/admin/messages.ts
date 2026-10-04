import { db } from '$server/db';
import { Failure } from '$server/respond';
import { rapLog } from './log';

// The context staff see around a reported message: this many messages either side of it.
const AROUND = 15;

export async function openReports() {
  const rows = await db.$queryRaw<
    {
      id: number;
      reason: string;
      created_at: number;
      content: string;
      sender_id: number;
      sender_name: string;
      reporter_id: number;
      reporter_name: string;
    }[]
  >`SELECT r.id, r.reason, r.created_at, c.content,
           c.user_id AS sender_id, s.username AS sender_name,
           r.reporter_id, p.username AS reporter_name
    FROM chat_reports r
    INNER JOIN chat_logs c ON c.id = r.message_id
    INNER JOIN users s ON s.id = c.user_id
    INNER JOIN users p ON p.id = r.reporter_id
    WHERE r.resolved_at IS NULL
    ORDER BY r.id`;
  return rows;
}

// Reading someone's messages is logged, so staff only look when a report gives them a reason to.
export async function reportedConversation(staffId: number, reportId: number) {
  const [report] = await db.$queryRaw<
    {
      id: number;
      message_id: number;
      reason: string;
      created_at: number;
      resolved_at: number | null;
      sender_id: number;
      reporter_id: number;
    }[]
  >`SELECT r.id, r.message_id, r.reason, r.created_at, r.resolved_at, c.user_id AS sender_id, r.reporter_id
    FROM chat_reports r INNER JOIN chat_logs c ON c.id = r.message_id WHERE r.id = ${reportId}`;
  if (!report) throw new Failure(404, 'site.invalid_request');

  const { sender_id: a, reporter_id: b, message_id: id } = report;
  const [before, after, users] = await Promise.all([
    db.$queryRaw<{ id: number; user_id: number; content: string; time: bigint }[]>`
      SELECT id, user_id, content, UNIX_TIMESTAMP(time) AS time FROM chat_logs
      WHERE ((user_id = ${a} AND target_id = ${b}) OR (user_id = ${b} AND target_id = ${a})) AND id <= ${id}
      ORDER BY id DESC LIMIT ${AROUND + 1}`,
    db.$queryRaw<{ id: number; user_id: number; content: string; time: bigint }[]>`
      SELECT id, user_id, content, UNIX_TIMESTAMP(time) AS time FROM chat_logs
      WHERE ((user_id = ${a} AND target_id = ${b}) OR (user_id = ${b} AND target_id = ${a})) AND id > ${id}
      ORDER BY id LIMIT ${AROUND}`,
    db.users.findMany({ where: { id: { in: [a, b] } }, select: { id: true, username: true } })
  ]);

  const sender = users.find((u) => u.id === a)?.username ?? String(a);
  const reporter = users.find((u) => u.id === b)?.username ?? String(b);
  await rapLog(
    staffId,
    `has read the messages between ${sender} and ${reporter} for report #${reportId}`
  );

  return {
    report: { ...report, sender, reporter },
    messages: [...before.reverse(), ...after].map((m) => ({
      id: m.id,
      from: m.user_id,
      content: m.content,
      time: Number(m.time)
    }))
  };
}

export async function resolveReport(staffId: number, reportId: number) {
  const resolved = await db.$executeRaw`
    UPDATE chat_reports SET resolved_by = ${staffId}, resolved_at = ${Math.floor(Date.now() / 1000)}
    WHERE id = ${reportId} AND resolved_at IS NULL`;
  if (!resolved) throw new Failure(404, 'site.invalid_request');
  await rapLog(staffId, `has resolved message report #${reportId}`);
}
