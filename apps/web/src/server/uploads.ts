import { Privilege } from '$lib/auth/privileges';
import { db } from './db';
import { Failure } from './respond';
import { rapLog } from './admin/log';

// Players ask for plays to be uploaded to the YouTube channel, and everyone can vote on them before staff decide.

export const PAGE_SIZE = 20;
export const MAX_PENDING = 3;
export const MAX_URL = 255;
export const MAX_SKIN = 100;
export const MAX_REASON = 1000;

export const STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type Status = (typeof STATUSES)[number];

interface Row {
  id: number;
  user_id: number;
  username: string;
  country: string;
  replay_url: string;
  map_url: string;
  skin: string;
  reason: string;
  status: number;
  created_at: number;
  up: bigint;
  down: bigint;
  mine: number | null;
}

export async function listRequests(status: Status, page: number, viewerId: number | null) {
  const code = STATUSES.indexOf(status);
  const viewer = viewerId ?? 0;
  const [rows, total] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT r.id, r.user_id, u.username, u.country, r.replay_url, r.map_url, r.skin, r.reason,
             r.status, r.created_at,
             (SELECT COUNT(*) FROM upload_request_votes v WHERE v.request_id = r.id AND v.vote = 1) AS up,
             (SELECT COUNT(*) FROM upload_request_votes v WHERE v.request_id = r.id AND v.vote = -1) AS down,
             (SELECT v.vote FROM upload_request_votes v WHERE v.request_id = r.id AND v.user_id = ${viewer}) AS mine
      FROM upload_requests r
      INNER JOIN users u ON u.id = r.user_id
      WHERE r.status = ${code}
      ORDER BY r.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM upload_requests WHERE status = ${code}`
  ]);

  return {
    pages: Math.ceil(Number(total[0].total) / PAGE_SIZE),
    requests: rows.map((row) => ({
      id: row.id,
      user: { id: row.user_id, username: row.username, country: row.country },
      replayUrl: row.replay_url,
      mapUrl: row.map_url,
      skin: row.skin,
      reason: row.reason,
      status: STATUSES[row.status],
      time: row.created_at,
      up: Number(row.up),
      down: Number(row.down),
      mine: row.mine ?? 0
    }))
  };
}

export async function submit(
  userId: number,
  privileges: number,
  input: { replayUrl: string; mapUrl: string; skin: string; reason: string }
) {
  if (!(privileges & Privilege.Public)) throw new Failure(403, 'site.forbidden');

  const [open] = await db.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) AS total FROM upload_requests WHERE user_id = ${userId} AND status = 0`;
  if (Number(open.total) >= MAX_PENDING) throw new Failure(429, 'site.upload_requests_full');

  await db.$executeRaw`
    INSERT INTO upload_requests (user_id, replay_url, map_url, skin, reason, created_at)
    VALUES (${userId}, ${input.replayUrl}, ${input.mapUrl}, ${input.skin}, ${input.reason},
            ${Math.floor(Date.now() / 1000)})`;
}

export async function withdraw(userId: number, requestId: number) {
  const removed = await db.$executeRaw`
    DELETE FROM upload_requests WHERE id = ${requestId} AND user_id = ${userId} AND status = 0`;
  if (!removed) throw new Failure(404, 'site.invalid_request');
}

// A vote of 0 takes the player's vote back. Only open requests can be voted on, and not your own.
export async function vote(userId: number, requestId: number, value: -1 | 0 | 1) {
  const [request] = await db.$queryRaw<{ user_id: number; status: number }[]>`
    SELECT user_id, status FROM upload_requests WHERE id = ${requestId}`;
  if (!request || request.status !== 0 || request.user_id === userId) {
    throw new Failure(400, 'site.invalid_request');
  }

  if (value === 0) {
    await db.$executeRaw`
      DELETE FROM upload_request_votes WHERE request_id = ${requestId} AND user_id = ${userId}`;
  } else {
    await db.$executeRaw`
      INSERT INTO upload_request_votes (request_id, user_id, vote)
      VALUES (${requestId}, ${userId}, ${value})
      ON DUPLICATE KEY UPDATE vote = VALUES(vote)`;
  }

  const [counts] = await db.$queryRaw<{ up: bigint; down: bigint }[]>`
    SELECT COALESCE(SUM(vote = 1), 0) AS up, COALESCE(SUM(vote = -1), 0) AS down
    FROM upload_request_votes WHERE request_id = ${requestId}`;
  return { up: Number(counts.up), down: Number(counts.down), mine: value };
}

export async function review(staffId: number, requestId: number, status: Status) {
  const code = STATUSES.indexOf(status);
  const reviewed = await db.$executeRaw`
    UPDATE upload_requests
    SET status = ${code},
        reviewed_by = ${code === 0 ? null : staffId},
        reviewed_at = ${code === 0 ? null : Math.floor(Date.now() / 1000)}
    WHERE id = ${requestId}`;
  if (!reviewed) throw new Failure(404, 'site.invalid_request');
  await rapLog(staffId, `has set upload request #${requestId} to ${status}`);
}
