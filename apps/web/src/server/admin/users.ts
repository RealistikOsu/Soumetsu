import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '$server/config';
import { db } from '$server/db';
import { md5 } from '$server/identity';
import { ifLazerTables } from '$server/lazer';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { kick, removeFromLeaderboards, removeFromScopeLeaderboards } from './bancho';
import { rapLog } from './log';

const SUFFIXES = ['_std', '_taiko', '_ctb', '_mania'];
const STAT_TABLES = {
  va: 'users_stats',
  rx: 'rx_stats',
  ap: 'ap_stats',
  lz: 'lazer_stats'
} as const;
const LAZER_STAT_TABLES = ['lazer_stats', 'lazer_rx_stats', 'lazer_ap_stats'];
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

// A map has one first place per mode and relax type, so the old row goes before the new holder is written.
async function recalcFirstPlace(beatmapMd5: string, custom: number, mode: number) {
  await db.$executeRawUnsafe(
    'DELETE FROM first_places WHERE beatmap_md5 = ? AND mode = ? AND relax = ?',
    beatmapMd5,
    mode,
    custom
  );
  const table = SCORE_TABLES[(['va', 'rx', 'ap'] as const)[custom]];
  const top = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT s.id, s.userid, s.score, s.max_combo, s.full_combo, s.mods, s.300_count, s.100_count,
            s.50_count, s.misses_count, s.time, s.play_mode, s.completed, s.accuracy, s.pp,
            s.playtime, s.beatmap_md5
     FROM ${table} s RIGHT JOIN users a ON a.id = s.userid
     WHERE s.beatmap_md5 = ? AND s.play_mode = ? AND s.completed = 3 AND a.privileges & 1
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
    if (type === 'lz') {
      const columns = modes.flatMap((mode) =>
        STAT_COLUMNS.map((column) => `${column}${SUFFIXES[mode]} = 0`)
      );
      for (const table of LAZER_STAT_TABLES) {
        await ifLazerTables(
          db.$executeRawUnsafe(`UPDATE ${table} SET ${columns.join(', ')} WHERE id = ?`, userId)
        );
      }
      await ifLazerTables(
        db.$executeRawUnsafe(
          `DELETE FROM lazer_scores WHERE user_id = ? AND ruleset_id IN (${modes.join(',')})`,
          userId
        )
      );
      continue;
    }
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
  const user = await db.users.findUnique({ where: { id: userId }, select: { country: true } });
  await removeFromScopeLeaderboards(userId, user?.country ?? null, { modes, types });
}

export async function rollback(userId: number, days: number, { modes, types }: Scope) {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  for (const type of types) {
    if (type === 'lz') {
      await ifLazerTables(
        db.$executeRawUnsafe(
          `DELETE FROM lazer_scores WHERE user_id = ? AND created_at > FROM_UNIXTIME(?) AND ruleset_id IN (${modes.join(',')})`,
          userId,
          cutoff
        )
      );
      continue;
    }
    const table = SCORE_TABLES[type];
    const where = `userid = ? AND time > ? AND play_mode IN (${modes.join(',')})`;
    const affected = await db.$queryRawUnsafe<{ beatmap_md5: string; play_mode: number }[]>(
      `SELECT beatmap_md5, play_mode FROM ${table} WHERE ${where}`,
      userId,
      cutoff
    );
    await db.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${where}`, userId, cutoff);
    // Several removed scores can be on one map; it only needs working out once.
    const maps = new Set(affected.map((row) => `${row.beatmap_md5}:${row.play_mode}`));
    for (const key of maps) {
      const [md5, mode] = key.split(':');
      await recalcFirstPlace(md5, CUSTOM[type], Number(mode));
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
  // users.ban_reason only holds 128 characters; the ban log keeps the whole reason.
  const short = reason.length > 128 ? `${reason.slice(0, 127)}…` : reason;
  if (reason) await db.users.update({ where: { id: userId }, data: { ban_reason: short } });
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

  const firsts = await db.$queryRaw<{ beatmap_md5: string; mode: number; relax: number }[]>`
    SELECT DISTINCT beatmap_md5, mode, relax FROM first_places WHERE user_id = ${userId}`;
  for (const { beatmap_md5, mode, relax } of firsts) {
    await recalcFirstPlace(beatmap_md5, Number(relax), Number(mode));
  }
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

// Everything that identifies the player or makes up their public profile. Their scores, stats, first places
// and the maps they ranked stay, as on bancho, and so do their IP and hardware logs, which catch a return on
// another account.
const PERSONAL: [string, string[]][] = [
  ['tokens', ['user']],
  ['remember', ['userid']],
  ['2fa', ['userid']],
  ['2fa_telegram', ['userid']],
  ['2fa_totp', ['userid']],
  ['user_totp', ['user_id']],
  ['user_totp_recovery', ['user_id']],
  ['discord_roles', ['userid']],
  ['discord_oauth', ['user_id']],
  ['osu_official_links', ['osu_user_id']],
  ['twitch_links', ['osu_user_id']],
  ['profile_backgrounds', ['uid']],
  ['users_relationships', ['user1', 'user2']],
  ['user_badges', ['user']],
  ['user_clans', ['user']],
  ['user_comments', ['op', 'prof']],
  ['comments', ['user_id']],
  ['beatmaps_rating', ['user_id']],
  ['user_pinned', ['userid']],
  ['user_name_history', ['user_id']],
  ['whitelist', ['user_id']],
  ['rank_requests', ['userid']],
  ['chat_logs', ['user_id', 'target_id']],
  ['chat_reads', ['user_id', 'peer_id']]
];

// Deleting an account anonymises it: the row stays as DeletedUser_<id> so its scores keep their place on
// beatmap leaderboards, while the account drops off profiles, search and the global leaderboards.
export async function deleteAccount(userId: number, authorization: string) {
  const owned = await db.user_clans.count({ where: { user: userId, perms: 8 } });
  if (owned) throw new Failure(400, 'They own a clan. Transfer it or disband it first.');
  const user = await db.users.findUnique({ where: { id: userId }, select: { country: true } });
  if (!user) throw new Failure(404, 'users.user_not_found');

  await kick(userId, `Your account on ${config.serverName} has been deleted. Bye!`);
  await removeFromLeaderboards(userId, user.country);
  await resetAvatar(userId, authorization);

  for (const [table, columns] of PERSONAL) {
    const where = columns.map((column) => `\`${column}\` = ?`).join(' OR ');
    // Some deployments never had the 2FA tables.
    await db
      .$executeRawUnsafe(`DELETE FROM \`${table}\` WHERE ${where}`, ...columns.map(() => userId))
      .catch((error) => {
        if (!String(error).includes("doesn't exist")) throw error;
      });
  }

  await ifLazerTables(db.$executeRaw`DELETE FROM lazer_tokens WHERE user_id = ${userId}`);

  const name = `DeletedUser_${userId}`;
  const unusable = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  await db.users.update({
    where: { id: userId },
    data: {
      username: name,
      username_safe: name.toLowerCase(),
      email: `deleted_${userId}@deleted.invalid`,
      password_md5: unusable,
      // Public and normal only, so the scores stay on beatmap leaderboards; latest_activity 0 keeps the cron
      // treating the account as inactive, which keeps it off the global leaderboards for good.
      privileges: 3,
      latest_activity: 0,
      country: 'XX',
      donor_expire: 0,
      notes: null,
      deleted: true
    }
  });
  await Promise.all(
    ['users_stats', 'rx_stats', 'ap_stats'].map((table) =>
      db.$executeRawUnsafe(`UPDATE ${table} SET username = ? WHERE id = ?`, name, userId)
    )
  );
  await db.$executeRaw`
    UPDATE users_stats
    SET username_aka = '', userpage_content = NULL, show_custom_badge = 0, custom_badge_name = '',
        custom_badge_icon = '', country = 'XX'
    WHERE id = ${userId}`;
  await redis.publish(
    'peppy:change_username',
    JSON.stringify({ userID: userId, newUsername: name })
  );
}
