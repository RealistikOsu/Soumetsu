import bcrypt from 'bcryptjs';
import { config } from '$server/config';
import { db } from '$server/db';
import { md5 } from '$server/identity';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { kick, removeFromLeaderboards } from './bancho';
import { rapLog } from './log';

const SUFFIXES = ['_std', '_taiko', '_ctb', '_mania'];
const STAT_TABLES = { va: 'users_stats', rx: 'rx_stats', ap: 'ap_stats' } as const;
const SCORE_TABLES = { va: 'scores', rx: 'scores_relax', ap: 'scores_ap' } as const;
const CUSTOM = { va: 0, rx: 1, ap: 2 } as const;
const STAT_COLUMNS = [
  'ranked_score',
  'playcount',
  'total_score',
  'replays_watched',
  'total_hits',
  'level',
  'playtime',
  'avg_accuracy',
  'pp'
];

export type Type = keyof typeof STAT_TABLES;

export interface Scope {
  modes: number[];
  types: Type[];
}

export function parseScope(body: { modes?: unknown; types?: unknown }): Scope {
  const modes = (Array.isArray(body.modes) ? body.modes : []).map(Number);
  const types = (Array.isArray(body.types) ? body.types : []) as string[];
  const badMode = modes.some((m) => !Number.isInteger(m) || m < 0 || m > 3);
  const badType = types.some((t) => !(t in STAT_TABLES));
  if (!modes.length || !types.length || badMode || badType) {
    throw new Failure(400, 'auth.validation_error');
  }
  return { modes, types: types as Type[] };
}

export async function nameOf(userId: number) {
  const user = await db.users.findUnique({ where: { id: userId }, select: { username: true } });
  if (!user) throw new Failure(404, 'users.user_not_found');
  return user.username;
}

async function recalcFirstPlace(beatmapMd5: string, custom: number, mode: number) {
  const table = SCORE_TABLES[(['va', 'rx', 'ap'] as const)[custom]];
  const top = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT s.id, s.userid, s.score, s.max_combo, s.full_combo, s.mods, s.300_count, s.100_count,
            s.50_count, s.misses_count, s.time, s.play_mode, s.completed, s.accuracy, s.pp,
            s.playtime, s.beatmap_md5
     FROM ${table} s RIGHT JOIN users a ON a.id = s.userid
     WHERE s.beatmap_md5 = ? AND s.play_mode = ? AND s.completed = 3 AND a.privileges & 2
     ORDER BY s.pp DESC LIMIT 1`,
    beatmapMd5,
    mode
  );
  if (!top.length) return;
  await db.$executeRawUnsafe(
    `INSERT INTO first_places (score_id, user_id, score, max_combo, full_combo, mods, 300_count,
       100_count, 50_count, miss_count, timestamp, mode, completed, accuracy, pp, play_time,
       beatmap_md5, relax)
     VALUES (${new Array(18).fill('?').join(',')})`,
    ...Object.values(top[0]),
    custom
  );
}

export async function wipeStats(userId: number, { modes, types }: Scope) {
  for (const type of types) {
    const columns = modes.flatMap((mode) => [
      ...STAT_COLUMNS.map((column) => `${column}${SUFFIXES[mode]} = 0`),
      ...(mode === 0 ? ['unrestricted_pp = 0'] : [])
    ]);
    await db.$executeRawUnsafe(
      `UPDATE ${STAT_TABLES[type]} SET ${columns.join(', ')} WHERE id = ?`,
      userId
    );
    await db.$executeRawUnsafe(
      `DELETE FROM ${SCORE_TABLES[type]} WHERE userid = ? AND play_mode IN (${modes.join(',')})`,
      userId
    );
  }
}

export async function rollback(userId: number, days: number, { modes, types }: Scope) {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  for (const type of types) {
    const table = SCORE_TABLES[type];
    const where = `userid = ? AND time > ? AND play_mode IN (${modes.join(',')})`;
    const affected = await db.$queryRawUnsafe<{ beatmap_md5: string; play_mode: number }[]>(
      `SELECT beatmap_md5, play_mode FROM ${table} WHERE ${where}`,
      userId,
      cutoff
    );
    await db.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${where}`, userId, cutoff);
    for (const { beatmap_md5, play_mode } of affected) {
      await db.$executeRawUnsafe(
        'DELETE FROM first_places WHERE beatmap_md5 = ? AND user_id = ? AND relax = ? AND mode = ?',
        beatmap_md5,
        userId,
        CUSTOM[type],
        play_mode
      );
      await recalcFirstPlace(beatmap_md5, CUSTOM[type], play_mode);
    }
  }
  await kick(userId, 'Your account has been rolled back. Please reconnect.');
}

const logBan = (from: number, to: number, summary: string, reason: string) =>
  db.ban_logs.create({
    data: { from_id: from, to_id: to, summary, detail: reason || 'No reason provided.' }
  });

async function target(userId: number, reason: string) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { privileges: true, country: true }
  });
  if (!user) throw new Failure(404, 'users.user_not_found');
  if (reason) await db.users.update({ where: { id: userId }, data: { ban_reason: reason } });
  return { privileges: Number(user.privileges), country: user.country };
}

// Returns true when the account ended up restricted, false when it was released.
export async function toggleRestrict(userId: number, from: number, reason: string, note: string) {
  const { privileges, country } = await target(userId, reason);

  if (!(privileges & 1)) {
    await db.users.update({
      where: { id: userId },
      data: { privileges: privileges | 1, ban_datetime: '0' }
    });
    await logBan(from, userId, 'Unrestrict', reason);
    await redis.publish('peppy:ban', String(userId));
    return false;
  }

  await db.users.update({
    where: { id: userId },
    data: { privileges: 2, ban_datetime: String(Math.floor(Date.now() / 1000)) }
  });
  await removeFromLeaderboards(userId, country);
  await logBan(from, userId, 'Restrict', reason);
  if (note) {
    await db.$executeRaw`UPDATE users SET notes = CONCAT(COALESCE(notes, ''), ${'\n' + note}) WHERE id = ${userId}`;
  }

  const firsts = await db.$queryRaw<{ beatmap_md5: string }[]>`
    SELECT beatmap_md5 FROM first_places WHERE user_id = ${userId}`;
  await db.$executeRaw`DELETE FROM first_places WHERE user_id = ${userId}`;
  for (const { beatmap_md5 } of firsts) await recalcFirstPlace(beatmap_md5, 0, 0);
  await redis.publish('peppy:ban', String(userId));
  return true;
}

export async function toggleBan(userId: number, from: number, reason: string) {
  const { privileges, country } = await target(userId, reason);

  if (privileges === 0) {
    await db.users.update({ where: { id: userId }, data: { privileges: 3, ban_datetime: '0' } });
    await logBan(from, userId, 'Unban', reason);
    await redis.publish('peppy:ban', String(userId));
    return false;
  }

  await db.users.update({
    where: { id: userId },
    data: { privileges: 0, ban_datetime: String(Math.floor(Date.now() / 1000)) }
  });
  await removeFromLeaderboards(userId, country);
  await kick(userId, `You have been banned from ${config.serverName}. You will not be missed.`);
  await logBan(from, userId, 'Ban', reason);
  await redis.publish('peppy:ban', String(userId));
  return true;
}

export async function toggleFreeze(userId: number) {
  const user = await db.users.findUnique({ where: { id: userId }, select: { frozen: true } });
  if (!user) throw new Failure(404, 'users.user_not_found');
  if (user.frozen) {
    await db.users.update({
      where: { id: userId },
      data: { frozen: 0, freezedate: 0, firstloginafterfrozen: 1 }
    });
    return false;
  }
  await db.users.update({
    where: { id: userId },
    data: { frozen: 1, freezedate: Math.floor(Date.now() / 1000) + 5 * 86400 }
  });
  return true;
}

export async function addSupporter(userId: number, days: number) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { privileges: true, donor_expire: true }
  });
  if (!user) throw new Failure(404, 'users.user_not_found');

  const privileges = Number(user.privileges);
  if (privileges & 4) {
    await db.users.update({
      where: { id: userId },
      data: { donor_expire: user.donor_expire + days * 86400 }
    });
    return;
  }
  await db.users.update({
    where: { id: userId },
    data: { privileges: privileges + 4, donor_expire: Math.floor(Date.now() / 1000) + days * 86400 }
  });
  await db.users_stats.update({ where: { id: userId }, data: { can_custom_badge: true } });
  await db.user_badges.create({ data: { user: userId, badge: config.donorBadgeId } });
}

export async function removeSupporter(userId: number) {
  const user = await db.users.findUnique({ where: { id: userId }, select: { privileges: true } });
  if (!user || !(Number(user.privileges) & 4)) return false;

  await db.users.update({
    where: { id: userId },
    data: { privileges: Number(user.privileges) - 4, donor_expire: 0 }
  });
  await db.users_stats.update({
    where: { id: userId },
    data: { can_custom_badge: false, show_custom_badge: false }
  });
  await db.user_badges.deleteMany({ where: { user: userId, badge: config.donorBadgeId } });
  return true;
}

export async function changePassword(userId: number, password: string) {
  const hash = await bcrypt.hash(md5(password), 10);
  await db.users.update({ where: { id: userId }, data: { password_md5: hash } });
  await redis.publish('peppy:change_pass', JSON.stringify({ user_id: userId }));
}

async function takenBy(username: string, ignore: number) {
  const current = await db.users.findFirst({ where: { username }, select: { id: true } });
  if (current) return current.id;
  const old = await db.user_name_history.findFirst({
    where: { username, user_id: { not: ignore } },
    select: { user_id: true }
  });
  return old?.user_id ?? null;
}

// Returns the message the panel showed when the name can't be used, or null once the rename is done.
export async function rename(userId: number, by: number, requested: string, skipHistory: boolean) {
  const username = requested.trim();
  const old = await nameOf(userId);
  if (username === old) return 'The new username may not be the same as the old.';

  const taken = await takenBy(username, userId);
  if (taken) return `This username is already occupied by ${await nameOf(taken)} (${taken}).`;

  if (!skipHistory) {
    await db.user_name_history.create({
      data: { user_id: userId, username: old, replaced_at: Math.floor(Date.now() / 1000) }
    });
  }
  const safe = username.toLowerCase().replace(/ /g, '_').trim();
  await db.users.update({ where: { id: userId }, data: { username, username_safe: safe } });
  await Promise.all(
    ['users_stats', 'rx_stats', 'ap_stats'].map((table) =>
      db.$executeRawUnsafe(`UPDATE ${table} SET username = ? WHERE id = ?`, username, userId)
    )
  );
  await db.user_name_history.deleteMany({ where: { username, user_id: userId } });

  await kick(userId, 'Your username has been changed. Please re-log.');
  await redis.publish(
    'peppy:change_username',
    JSON.stringify({ userID: userId, newUsername: username })
  );
  await rapLog(by, `renamed ${old} (${userId}) to '${username}'`);
  return null;
}

// The API owns the avatar files, so it deletes them and writes its own action log entry.
export async function resetAvatar(userId: number, authorization: string) {
  const response = await fetch(`${config.apiUrl}/api/v2/admin/users/${userId}/avatar`, {
    method: 'DELETE',
    headers: { Authorization: authorization }
  });
  if (!response.ok) throw new Failure(response.status, 'Failed to reset the avatar.');
}

const KEYS: Record<string, string[]> = {
  users: ['id'],
  users_stats: ['id'],
  rx_stats: ['id'],
  ap_stats: ['id'],
  beatmaps_rating: ['user_id'],
  comments: ['user_id'],
  profile_backgrounds: ['uid'],
  reports: ['to_uid', 'from_uid'],
  tokens: ['user'],
  users_achievements: ['user_id'],
  users_beatmap_playcount: ['user_id'],
  users_relationships: ['user1', 'user2'],
  user_badges: ['user'],
  user_clans: ['user']
};

const TABLES = [
  'scores',
  'users',
  '2fa',
  '2fa_telegram',
  '2fa_totp',
  'beatmaps_rating',
  'comments',
  'discord_roles',
  'ip_user',
  'profile_backgrounds',
  'rank_requests',
  'reports',
  'tokens',
  'remember',
  'users_achievements',
  'users_beatmap_playcount',
  'users_relationships',
  'user_badges',
  'user_clans',
  'users_stats',
  'scores_relax',
  'rx_stats',
  'scores_ap',
  'ap_stats'
];

// The same sweep the panel did: every table that points at the account loses its rows.
export async function deleteAccount(userId: number) {
  await kick(userId, `You have been deleted from ${config.serverName}. Bye!`);
  for (const table of TABLES) {
    const columns = KEYS[table] ?? ['userid'];
    const where = columns.map((column) => `\`${column}\` = ?`).join(' OR ');
    // Some deployments never had the 2FA tables.
    await db
      .$executeRawUnsafe(`DELETE FROM \`${table}\` WHERE ${where}`, ...columns.map(() => userId))
      .catch((error) => {
        if (!String(error).includes("doesn't exist")) throw error;
      });
  }
}
