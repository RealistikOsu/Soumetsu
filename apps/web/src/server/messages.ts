import { Prisma } from './generated/client';
import { db } from './db';
import { CHANNEL } from './inbox';
import { redis } from './redis';
import { Failure } from './respond';

// Private messages live in chat_logs, shared with bancho: it saves in-game ones there and delivers the ones
// sent from here to whoever is online. chat_reads holds how far each player has read each conversation.

// bancho's BotUserId. Old logs are full of commands sent to it, which aren't conversations.
const BOT_ID = 999;
const PUBLIC = 1;
const NORMAL = 2;
const ADMIN_ACCESS_RAP = 8;
export const MAX_LENGTH = 1000;
const PAGE = 50;

export interface Message {
  id: number;
  from: number;
  content: string;
  time: number;
}

interface Row {
  id: number;
  user_id: number;
  content: string;
  time: bigint;
}

const toMessage = (row: Row): Message => ({
  id: row.id,
  from: row.user_id,
  content: row.content,
  time: Number(row.time)
});

export async function conversations(userId: number) {
  const latest = await db.$queryRaw<{ peer: number; last_id: number }[]>`
    SELECT peer, MAX(id) AS last_id FROM (
      SELECT target_id AS peer, id FROM chat_logs WHERE user_id = ${userId}
      UNION ALL
      SELECT user_id AS peer, id FROM chat_logs WHERE target_id = ${userId}
    ) pairs
    WHERE peer <> ${BOT_ID} AND peer <> ${userId}
    GROUP BY peer ORDER BY last_id DESC LIMIT 100`;
  if (!latest.length) return [];

  const ids = latest.map((row) => row.last_id);
  const peers = latest.map((row) => row.peer);
  const [messages, users, unread] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT id, user_id, content, UNIX_TIMESTAMP(time) AS time FROM chat_logs
      WHERE id IN (${Prisma.join(ids)})`,
    db.users.findMany({
      where: { id: { in: peers } },
      select: { id: true, username: true, country: true, deleted: true }
    }),
    unreadByPeer(userId)
  ]);

  return latest.flatMap(({ peer, last_id }) => {
    const user = users.find((u) => u.id === peer);
    const last = messages.find((m) => m.id === last_id);
    if (!user || !last) return [];
    return [
      {
        peer: { id: user.id, username: user.username, country: user.country },
        last: toMessage(last),
        unread: unread[peer] ?? 0
      }
    ];
  });
}

async function unreadByPeer(userId: number) {
  const rows = await db.$queryRaw<{ peer: number; count: bigint }[]>`
    SELECT c.user_id AS peer, COUNT(*) AS count FROM chat_logs c
    LEFT JOIN chat_reads r ON r.user_id = c.target_id AND r.peer_id = c.user_id
    WHERE c.target_id = ${userId} AND c.user_id <> ${BOT_ID}
      AND c.id > COALESCE(r.last_read_id, 0)
    GROUP BY c.user_id`;
  return Object.fromEntries(rows.map((row) => [row.peer, Number(row.count)]));
}

export async function unreadTotal(userId: number) {
  return Object.values(await unreadByPeer(userId)).reduce((sum, count) => sum + count, 0);
}

// Opening a conversation reads it, so everything up to the newest message counts as read.
export async function thread(userId: number, peerId: number, before: number | null) {
  const rows = await db.$queryRaw<Row[]>`
    SELECT id, user_id, content, UNIX_TIMESTAMP(time) AS time FROM chat_logs
    WHERE ((user_id = ${userId} AND target_id = ${peerId}) OR (user_id = ${peerId} AND target_id = ${userId}))
      AND id < ${before ?? 2 ** 31 - 1}
    ORDER BY id DESC LIMIT ${PAGE}`;
  const messages = rows.reverse().map(toMessage);

  const newest = messages.at(-1)?.id;
  if (!before && newest) await markRead(userId, peerId, newest);
  const seen = await db.$queryRaw<{ last_read_id: number }[]>`
    SELECT last_read_id FROM chat_reads WHERE user_id = ${peerId} AND peer_id = ${userId}`;

  return { messages, more: rows.length === PAGE, peerReadId: seen[0]?.last_read_id ?? 0 };
}

async function markRead(userId: number, peerId: number, messageId: number) {
  await db.$executeRaw`
    INSERT INTO chat_reads (user_id, peer_id, last_read_id) VALUES (${userId}, ${peerId}, ${messageId})
    ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, ${messageId})`;
}

// The same rules as messaging in game: banned, restricted and silenced players can't send.
export async function send(senderId: number, peerId: number, content: string) {
  if (peerId === senderId || peerId === BOT_ID) throw new Failure(400, 'site.invalid_request');
  const [sender, peer] = await Promise.all([
    db.users.findUnique({
      where: { id: senderId },
      select: { username: true, privileges: true, silence_end: true }
    }),
    db.users.findUnique({ where: { id: peerId }, select: { deleted: true, privileges: true } })
  ]);
  if (!sender || !peer || peer.deleted) throw new Failure(404, 'users.user_not_found');

  const privileges = Number(sender.privileges);
  // In game a restricted player can't be reached at all, so the site reads the same as a missing user, except for staff.
  if (!(Number(peer.privileges) & PUBLIC) && !(privileges & ADMIN_ACCESS_RAP)) {
    throw new Failure(404, 'users.user_not_found');
  }
  if (!(privileges & NORMAL)) throw new Failure(403, 'site.forbidden');
  if (!(privileges & PUBLIC)) throw new Failure(403, 'site.messages_restricted');
  if (sender.silence_end > Date.now() / 1000) throw new Failure(403, 'site.messages_silenced');

  const rate = `soumetsu:messages_rate:${senderId}`;
  const sent = await redis.incr(rate);
  if (sent === 1) await redis.expire(rate, 10);
  if (sent > 5) throw new Failure(429, 'site.messages_too_fast');

  const id = await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO chat_logs (user_id, target_id, content) VALUES (${senderId}, ${peerId}, ${content})`;
    const [row] = await tx.$queryRaw<{ id: bigint }[]>`SELECT LAST_INSERT_ID() AS id`;
    return Number(row.id);
  });
  await markRead(senderId, peerId, id);
  await redis.publish(
    'rosu:chat_message',
    JSON.stringify({
      id,
      sender_id: senderId,
      sender_name: sender.username,
      target_id: peerId,
      content
    })
  );
  await redis.publish(CHANNEL, JSON.stringify({ target_id: peerId, sender_id: senderId }));
  return { id, from: senderId, content, time: Math.floor(Date.now() / 1000) } satisfies Message;
}

export async function report(reporterId: number, messageId: number, reason: string) {
  const [message] = await db.$queryRaw<{ user_id: number; target_id: number }[]>`
    SELECT user_id, target_id FROM chat_logs WHERE id = ${messageId}`;
  if (!message || message.target_id !== reporterId) throw new Failure(404, 'site.invalid_request');
  await db.$executeRaw`
    INSERT IGNORE INTO chat_reports (message_id, reporter_id, reason, created_at)
    VALUES (${messageId}, ${reporterId}, ${reason}, ${Math.floor(Date.now() / 1000)})`;
}
