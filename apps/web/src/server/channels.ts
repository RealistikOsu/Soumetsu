import { Privilege } from '$lib/auth/privileges';
import type { Caller } from './auth';
import { db } from './db';
import { limitRate, MAX_LENGTH, sendBlock } from './messages';
import { redis } from './redis';
import { Failure } from './respond';

// Public channels are shared with bancho and lazer: whoever receives a message first logs it to chat_chan_logs
// and publishes it on rosu:chat_public, and everyone else only relays it.

export const PUBLIC_CHANNEL = 'rosu:chat_public';
const PAGE = 50;
const STAFF = Privilege.AdminManageUsers | Privilege.AdminManageServer;
// Match, spectator and lazer multiplayer channels come and go, and #lobby is the multiplayer lobby.
const UNLISTED = [/^#spect_/i, /^#multi/i, /^#lazermp_/i, /^#lobby$/i];

export interface ChannelRow {
  name: string;
  description: string;
  status: number;
  public_read: number;
  public_write: number;
  auto_join: number;
  hidden: number;
}

export interface Channel {
  name: string;
  description: string;
}

export interface ChannelMessage {
  id: number;
  sender: { id: number; username: string };
  content: string;
  time: string;
}

export interface PublicPayload {
  id: number;
  source: 'bancho' | 'lazer' | 'web';
  channel: string;
  sender_id: number;
  sender_name: string;
  content: string;
  admin: boolean;
}

// Only the channels everyone joins in game and can talk in; staff get no extras here.
export const listed = (row: ChannelRow) =>
  Number(row.status) === 1 &&
  Number(row.public_read) === 1 &&
  Number(row.public_write) === 1 &&
  Number(row.auto_join) === 1 &&
  Number(row.hidden) === 0 &&
  !UNLISTED.some((pattern) => pattern.test(row.name));

export const byName = (a: Channel, b: Channel) =>
  a.name === '#osu' ? -1 : b.name === '#osu' ? 1 : a.name.localeCompare(b.name);

// URLs carry the name without its #.
export function channelName(param: string | undefined) {
  const name = (param ?? '').replace(/^#/, '');
  if (!/^[^\s#/]{1,63}$/u.test(name)) throw new Failure(400, 'site.invalid_request');
  return `#${name}`;
}

export function messageContent(raw: unknown) {
  const content = typeof raw === 'string' ? raw.trim() : '';
  if (!content || content.length > MAX_LENGTH) throw new Failure(400, 'site.invalid_request');
  if (content.startsWith('!')) throw new Failure(400, 'site.channel_no_commands');
  return content;
}

export const isAdmin = (privileges: number) => (privileges & STAFF) !== 0;

export function payload(
  id: number,
  channel: string,
  sender: { id: number; username: string; privileges: number },
  content: string
): PublicPayload {
  return {
    id,
    source: 'web',
    channel,
    sender_id: sender.id,
    sender_name: sender.username,
    content,
    admin: isAdmin(sender.privileges)
  };
}

// Anything published that doesn't look like a channel message is ignored rather than passed on.
export function fromPayload(raw: string, now = new Date()) {
  let data: Partial<PublicPayload>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof data?.id !== 'number' ||
    typeof data.channel !== 'string' ||
    typeof data.sender_id !== 'number' ||
    typeof data.sender_name !== 'string' ||
    typeof data.content !== 'string'
  ) {
    return null;
  }
  const message: ChannelMessage = {
    id: data.id,
    sender: { id: data.sender_id, username: data.sender_name },
    content: data.content,
    time: now.toISOString()
  };
  return { channel: data.channel, message };
}

export async function channelsFor(): Promise<Channel[]> {
  const rows = await db.$queryRaw<ChannelRow[]>`
    SELECT name, description, status, public_read, public_write, auto_join, hidden
    FROM bancho_channels WHERE status = 1`;
  return rows
    .filter(listed)
    .map((row) => ({ name: row.name, description: row.description }))
    .sort(byName);
}

export async function readable(name: string) {
  if (!(await channelsFor()).some((channel) => channel.name === name)) {
    throw new Failure(404, 'site.channel_not_found');
  }
}

// What stops the caller posting anywhere, so the page can say so before they type.
export async function blockFor(caller: Caller) {
  const user = await db.users.findUnique({
    where: { id: caller.id },
    select: { privileges: true, silence_end: true }
  });
  return user ? sendBlock(Number(user.privileges), user.silence_end) : 'site.forbidden';
}

interface Row {
  id: number;
  user_id: number;
  username: string;
  content: string;
  time: string;
}

const toMessage = (row: Row): ChannelMessage => ({
  id: Number(row.id),
  sender: { id: Number(row.user_id), username: row.username },
  content: row.content,
  time: row.time
});

// Restricted players' messages are hidden, as their profiles are.
export async function history(name: string, before: number | null) {
  await readable(name);
  const rows = await db.$queryRaw<Row[]>`
    SELECT c.id, c.user_id, u.username, c.content,
      DATE_FORMAT(c.time, '%Y-%m-%dT%H:%i:%sZ') AS time
    FROM chat_chan_logs c JOIN users u ON u.id = c.user_id
    WHERE c.target_chan = ${name} AND c.id < ${before ?? 2 ** 31 - 1}
      AND (u.privileges & ${Privilege.Public}) = ${Privilege.Public}
    ORDER BY c.id DESC LIMIT ${PAGE}`;
  return { messages: rows.reverse().map(toMessage), more: rows.length === PAGE };
}

export async function post(caller: Caller, name: string, raw: unknown) {
  const user = await db.users.findUnique({
    where: { id: caller.id },
    select: { username: true, privileges: true, silence_end: true }
  });
  if (!user) throw new Failure(403, 'site.forbidden');
  const blocked = sendBlock(Number(user.privileges), user.silence_end);
  if (blocked) throw new Failure(403, blocked);
  await readable(name);
  const content = messageContent(raw);
  await limitRate(caller.id);

  const id = await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO chat_chan_logs (user_id, target_chan, content, time, uuid)
      VALUES (${caller.id}, ${name}, ${content}, UTC_TIMESTAMP(), ${crypto.randomUUID()})`;
    const [row] = await tx.$queryRaw<{ id: bigint }[]>`SELECT LAST_INSERT_ID() AS id`;
    return Number(row.id);
  });
  // The session's privileges skip staff bits without two-factor, so that's what decides the admin flag.
  const message = payload(
    id,
    name,
    { id: caller.id, username: user.username, privileges: caller.privileges },
    content
  );
  await redis.publish(PUBLIC_CHANNEL, JSON.stringify(message));
  return {
    id,
    sender: { id: caller.id, username: user.username },
    content,
    time: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  } satisfies ChannelMessage;
}
