import { config } from './config';
import { db } from './db';
import { redis } from './redis';
import { Failure } from './respond';
import { avatarOf, postWebhook } from './admin/log';

// The same reasons bancho's !report understands, so both kinds read alike in the panel.
export const REPORT_REASONS = {
  cheating: 'Cheating',
  multiaccount: 'Multiaccounting',
  profile: 'Inappropriate profile',
  insulting: 'Insulting people',
  spam: 'Spam',
  other: 'Other'
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export const isReportReason = (value: unknown): value is ReportReason =>
  typeof value === 'string' && Object.hasOwn(REPORT_REASONS, value);

export async function reportUser(
  reporterId: number,
  targetId: number,
  reason: ReportReason,
  info: string
) {
  if (reporterId === targetId) throw new Failure(400, 'site.invalid_request');
  if (reason === 'other' && !info) throw new Failure(400, 'site.report_needs_info');
  const [reporter, target] = await Promise.all([
    db.users.findUnique({ where: { id: reporterId }, select: { username: true } }),
    db.users.findUnique({ where: { id: targetId }, select: { username: true, deleted: true } })
  ]);
  if (!reporter || !target || target.deleted) throw new Failure(404, 'users.user_not_found');

  // Once a day per player is plenty for staff to look, and stops a grudge turning into a flood.
  const key = `soumetsu:reported:${reporterId}:${targetId}`;
  if (!(await redis.set(key, '1', 'EX', 86_400, 'NX')))
    throw new Failure(429, 'site.report_already_sent');

  const label = REPORT_REASONS[reason];
  await db.$executeRaw`
    INSERT INTO reports (from_uid, to_uid, reason, chatlog, time)
    VALUES (${reporterId}, ${targetId}, ${`${label} - website${info ? ` (${info})` : ''}`}, '',
            ${Math.floor(Date.now() / 1000)})`;

  await postWebhook(config.reportWebhook, {
    content: '**New website report**',
    embeds: [
      {
        title: `Report by ${reporter.username}`,
        url: `${config.appBaseUrl}/admin/reports`,
        description: `**Target**: ${target.username}\n**Reason**: ${label}\n**Info**: ${info || 'None'}`,
        color: 0xff5555,
        thumbnail: { url: avatarOf(targetId) },
        footer: { text: `Reporter ID: ${reporterId} | Target ID: ${targetId}` }
      }
    ]
  });
}
