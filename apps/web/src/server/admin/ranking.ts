import { isServerOnlySet } from '$lib/assets';
import { Privilege } from '$lib/auth/privileges';
import { Prisma } from '$server/generated/client';
import { config } from '$server/config';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { avatarOf, postWebhook, rapLog } from './log';

export const STATUSES = { ranked: 2, loved: 5, unranked: 0 } as const;
export type StatusName = keyof typeof STATUSES;

export interface Ranker {
  id: number;
  username: string;
  privileges: number;
}

const MODE_BITS = [
  Privilege.AdminManageStdBeatmaps,
  Privilege.AdminManageTaikoBeatmaps,
  Privilege.AdminManageCatchBeatmaps,
  Privilege.AdminManageManiaBeatmaps
];

// Staff with the general beatmap bit can rank any mode, everyone else only the modes they were given.
export function rankableModes(privileges: number) {
  if (privileges & Privilege.AdminManageBeatmap) return [0, 1, 2, 3];
  return MODE_BITS.flatMap((bit, mode) => (privileges & bit ? [mode] : []));
}

// The queued requests a staff member may see: those whose set or difficulty is in a mode they can rank, and the
// ones nobody has played yet, which aren't stored so have no mode. Two EXISTS let MySQL use the set and beatmap id
// indexes; one join with an OR scanned every beatmap. The modes are integers from rankableModes.
export function visibleRequests(modes: number[]) {
  if (!modes.length) return 'FROM rank_requests rr WHERE 1 = 0';
  const list = modes.join(',');
  return `FROM rank_requests rr
    WHERE rr.blacklisted = 0 AND (
      EXISTS (SELECT 1 FROM beatmaps b
        WHERE rr.type = 's' AND b.beatmapset_id = rr.bid AND b.mode IN (${list}))
      OR EXISTS (SELECT 1 FROM beatmaps b
        WHERE rr.type = 'b' AND b.beatmap_id = rr.bid AND b.mode IN (${list}))
      OR (rr.type = 's' AND NOT EXISTS (SELECT 1 FROM beatmaps b WHERE b.beatmapset_id = rr.bid))
      OR (rr.type = 'b' AND NOT EXISTS (SELECT 1 FROM beatmaps b WHERE b.beatmap_id = rr.bid)))`;
}

export const coverOf = (setId: number) =>
  `https://assets.ppy.sh/beatmaps/${setId}/covers/cover.jpg`;

export function splitName(songName: string) {
  const match = songName.match(/^(.+)\s\[(.+)\]$/);
  return { song: match ? match[1] : songName, diff: match ? match[2] : 'Standard' };
}

const creators = new Map<number, string>();

// The mirror knows who mapped a set; the game database only keeps their id.
export async function creatorOf(setId: number) {
  const known = creators.get(setId);
  if (known) return known;

  const response = await fetch(`${config.mirrorUrl}/api/v2/beatmapsets/${setId}`, {
    signal: AbortSignal.timeout(2500)
  }).catch(() => null);
  const body = response?.ok
    ? ((await response.json().catch(() => null)) as { creator?: string } | null)
    : null;
  if (body?.creator) creators.set(setId, body.creator);
  return body?.creator ?? null;
}

interface MirrorSet {
  id: number;
  artist: string;
  title: string;
  creator: string;
  user_id: number;
  last_updated: string | null;
  beatmaps: {
    id: number;
    version: string;
    difficulty_rating: number;
    mode_int: number;
    status: string;
    ar: number;
    od: number;
    cs: number;
    hp: number;
    bpm: number;
    hit_length: number;
    total_length: number;
    max_combo: number | null;
    checksum: string;
  }[];
}

const MIRROR_STATUSES: Record<string, number> = { ranked: 2, approved: 3, qualified: 4, loved: 5 };

export async function mirrorSet(setId: number) {
  const response = await fetch(`${config.mirrorUrl}/api/v2/beatmapsets/${setId}`, {
    signal: AbortSignal.timeout(4000)
  }).catch(() => null);
  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as MirrorSet | null;
}

// A difficulty link names a beatmap, which the mirror maps to its set.
export async function mirrorSetOfBeatmap(beatmapId: number) {
  const response = await fetch(`${config.mirrorUrl}/api/v2/beatmaps/${beatmapId}`, {
    signal: AbortSignal.timeout(4000)
  }).catch(() => null);
  if (!response?.ok) return null;
  const body = (await response.json().catch(() => null)) as { set_id?: number } | null;
  return body?.set_id ?? null;
}

// The score service adds a map the first time someone plays it, so a set nobody has played isn't stored
// and can't be ranked. Its difficulties are copied in from the mirror; INSERT IGNORE leaves any the score
// service already wrote alone.
export async function importSet(setId: number) {
  const set = await mirrorSet(setId);
  if (!set?.beatmaps?.length) return;
  const updated = set.last_updated ? Math.floor(Date.parse(set.last_updated) / 1000) : 0;
  const rows = set.beatmaps.map((b) => {
    const stars = [0, 0, 0, 0];
    stars[b.mode_int] = b.difficulty_rating;
    return Prisma.sql`(${b.id}, ${set.id}, ${b.checksum}, ${`${set.artist} - ${set.title} [${b.version}]`},
      ${b.version}, ${b.ar}, ${b.cs}, ${b.hp}, ${b.od}, ${b.mode_int}, ${stars[0]}, ${stars[1]},
      ${stars[2]}, ${stars[3]}, ${b.max_combo ?? 0}, ${b.hit_length}, ${b.total_length},
      ${Math.round(b.bpm)}, ${MIRROR_STATUSES[b.status] ?? 0}, ${updated}, ${set.user_id})`;
  });
  await db.$executeRaw`
    INSERT IGNORE INTO beatmaps (beatmap_id, beatmapset_id, beatmap_md5, song_name, diff_name, ar, cs, hp,
      od, mode, difficulty_std, difficulty_taiko, difficulty_ctb, difficulty_mania, max_combo, hit_length,
      total_length, bpm, ranked, latest_update, mapper_id)
    VALUES ${Prisma.join(rows)}`;
}

// How many difficulties each set has and in which modes, for a whole page of sets in one query.
export async function setSummaries(setIds: number[]) {
  const rows = await db.beatmaps.findMany({
    where: { beatmapset_id: { in: [...new Set(setIds)] } },
    select: { beatmapset_id: true, mode: true }
  });
  const sets = new Map<number, { difficulties: number; modes: number[] }>();
  for (const row of rows) {
    const set = sets.get(row.beatmapset_id) ?? { difficulties: 0, modes: [] };
    set.difficulties++;
    if (!set.modes.includes(row.mode)) set.modes.push(row.mode);
    sets.set(row.beatmapset_id, set);
  }
  for (const set of sets.values()) set.modes.sort();
  return sets;
}

interface Row {
  beatmap_id: number;
  beatmapset_id: number;
  beatmap_md5: string;
  song_name: string;
  mode: number;
  difficulty_std: number;
  difficulty_taiko: number;
  difficulty_ctb: number;
  difficulty_mania: number;
  ranked: number;
  max_combo: number | null;
  dodge_the_beat: number;
  online_offset: number;
}

async function starRatings(rows: Row[]) {
  const payload = rows.map((row) => ({
    beatmap_id: row.beatmap_id,
    beatmap_md5: row.beatmap_md5,
    mode: row.mode,
    mods: 0,
    max_combo: row.max_combo ?? 0,
    accuracy: 100.0,
    miss_count: 0
  }));
  const response = await fetch(`${config.performanceUrl}/api/v1/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(4000)
  }).catch(() => null);
  const results = response?.ok
    ? ((await response.json().catch(() => null)) as { stars?: number }[] | null)
    : null;

  const stars = new Map<number, number>();
  if (Array.isArray(results) && results.length === payload.length) {
    results.forEach((result, i) => result.stars && stars.set(payload[i].beatmap_id, result.stars));
  }
  return stars;
}

// The stored rating for the difficulty's own mode, for when the performance service has none.
const storedStars = (row: Row) =>
  [row.difficulty_std, row.difficulty_taiko, row.difficulty_ctb, row.difficulty_mania][row.mode] ??
  row.difficulty_std;

// An id can name a single difficulty or a whole set, the panel took either. Set and beatmap ids share a
// range, so links that hold a set id say so; otherwise a set can open whichever set has a difficulty with
// the same number.
export async function loadSet(id: number, privileges: number, isSet = false) {
  const diff = isSet
    ? null
    : await db.beatmaps.findFirst({
        where: { beatmap_id: id },
        select: { beatmapset_id: true }
      });
  const setId = diff?.beatmapset_id ?? (isSet ? id : ((await mirrorSetOfBeatmap(id)) ?? id));
  if (!(await db.beatmaps.count({ where: { beatmapset_id: setId } }))) await importSet(setId);

  const all = await db.$queryRaw<Row[]>`
    SELECT beatmap_id, beatmapset_id, beatmap_md5, song_name, mode, difficulty_std, difficulty_taiko,
      difficulty_ctb, difficulty_mania, ranked, max_combo, dodge_the_beat,
      online_offset
    FROM beatmaps WHERE beatmapset_id = ${setId} AND ranked != -1`;
  if (!all.length) throw new Failure(404, 'Beatmap not found.');

  // The game database keeps every difficulty a set ever had, while the mirror lists only the current ones, so
  // older versions would crowd the page with maps nobody can play. Custom sets stay whole: a difficulty
  // submitted a moment ago may not be on the mirror yet.
  const mirror = isServerOnlySet(setId) ? null : await mirrorSet(setId);
  const current = new Set(mirror?.beatmaps?.map((b) => b.id));
  const live = current.size ? all.filter((row) => current.has(row.beatmap_id)) : all;
  const listed = live.length ? live : all;

  const modes = rankableModes(privileges);
  const rows = listed.filter((row) => modes.includes(row.mode));
  if (!rows.length) throw new Failure(403, 'You do not have permission to rank this beatmap.');

  const stars = await starRatings(rows);
  return {
    setId,
    title: splitName(all[0].song_name).song,
    creator: mirror?.creator ?? (await creatorOf(setId)),
    cover: coverOf(setId),
    difficulties: rows
      .map((row) => ({
        id: row.beatmap_id,
        name: splitName(row.song_name).diff,
        mode: row.mode,
        stars: stars.get(row.beatmap_id) ?? storedStars(row),
        ranked: row.ranked,
        dodge: Boolean(row.dodge_the_beat),
        offset: row.online_offset
      }))
      .sort((a, b) => a.stars - b.stars)
  };
}

const verb: Record<number, string> = { 2: 'ranked', 5: 'loved', 0: 'unranked' };

async function announce(
  by: Ranker,
  setId: number,
  beatmapId: number,
  name: string,
  status: number
) {
  const title = status === 2 ? 'ranked!' : status === 5 ? 'loved!' : 'unranked...';
  await postWebhook(config.rankedWebhook, {
    embeds: [
      {
        description: `Ranked by ${by.username}`,
        color: 242424,
        author: {
          name: `${name} was just ${title}`,
          url: `${config.appBaseUrl}/beatmaps/${beatmapId}`,
          icon_url: avatarOf(by.id)
        },
        footer: { text: 'via Soumetsu' },
        image: { url: coverOf(setId) }
      }
    ]
  });
}

// A request is answered once someone changes the status of its set or difficulty, so it leaves the queue.
const clearRequests = (setId: number, beatmapIds: number[]) =>
  db.rank_requests.deleteMany({
    where: {
      OR: [
        { type: 's', bid: setId },
        { type: 'b', bid: { in: beatmapIds } }
      ]
    }
  });

export const SUGGESTIONS_KEY = 'soumetsu:admin:suggestions';

// The game servers reload the maps, and the cached suggestions may list one that is no longer unranked.
const refresh = (md5s: string[]) =>
  Promise.all([
    ...md5s.map((md5) => redis.publish('ussr:refresh_bmap', md5)),
    redis.del(SUGGESTIONS_KEY)
  ]);

// Profiles list the maps a staff member ranked or loved; unranking takes the credit away.
async function recordRankers(userId: number, beatmapIds: number[], status: number) {
  if (status === STATUSES.unranked) {
    await db.beatmap_rankers.deleteMany({ where: { beatmap_id: { in: beatmapIds } } });
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const rows = beatmapIds.map((id) => Prisma.sql`(${id}, ${userId}, ${status}, ${now})`);
  await db.$executeRaw`
    INSERT INTO beatmap_rankers (beatmap_id, user_id, status, ranked_at) VALUES ${Prisma.join(rows)}
    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), status = VALUES(status), ranked_at = VALUES(ranked_at)`;
}

export async function rankSet(by: Ranker, setId: number, status: number) {
  // Same rows the panel lists: difficulties marked -1 are left alone, as loadSet hides them.
  const present = await db.beatmaps.findMany({
    where: { beatmapset_id: setId, ranked: { not: -1 } },
    select: { beatmap_md5: true, beatmap_id: true, song_name: true, mode: true }
  });
  if (!present.length) throw new Failure(404, 'Beatmap not found.');

  const modes = rankableModes(by.privileges);
  if (!present.some((row) => modes.includes(row.mode))) {
    throw new Failure(403, 'Insufficient privileges to rank this beatmapset.');
  }

  await db.beatmaps.updateMany({
    where: { beatmapset_id: setId, mode: { in: modes }, ranked: { not: -1 } },
    data: { ranked: status, ranked_status_freezed: true }
  });
  await recordRankers(
    by.id,
    present.filter((row) => modes.includes(row.mode)).map((row) => row.beatmap_id),
    status
  );
  await clearRequests(
    setId,
    present.map((row) => row.beatmap_id)
  );
  await announce(by, setId, present[0].beatmap_id, splitName(present[0].song_name).song, status);
  await refresh(present.map((row) => row.beatmap_md5));
  await rapLog(by.id, `${verb[status]} the beatmap set ${setId}`);
}

export async function rankDifficulty(by: Ranker, beatmapId: number, status: number) {
  const row = await db.beatmaps.findFirst({
    where: { beatmap_id: beatmapId },
    select: { mode: true, beatmap_md5: true, song_name: true, beatmapset_id: true }
  });
  if (!row) throw new Failure(404, 'Beatmap not found.');
  if (!rankableModes(by.privileges).includes(row.mode)) {
    throw new Failure(403, `Insufficient privileges to rank mode ${row.mode}.`);
  }

  await db.beatmaps.updateMany({
    where: { beatmap_id: beatmapId },
    data: { ranked: status, ranked_status_freezed: true }
  });
  await recordRankers(by.id, [beatmapId], status);
  await clearRequests(row.beatmapset_id, [beatmapId]);
  await announce(by, row.beatmapset_id, beatmapId, row.song_name, status);
  await refresh([row.beatmap_md5]);
  await rapLog(by.id, `${verb[status]} the beatmap ${row.song_name} (${beatmapId})`);
}

const CATCH = 2;

const BOARDS = [
  { table: 'scores', relax: 0 },
  { table: 'scores_relax', relax: 1 },
  { table: 'scores_ap', relax: 2 }
] as const;

// A dodge the beat map ranks by how much of it was avoided, which the Pentagon stores as the accuracy, then by
// the lower score. Every other map ranks by score, or by pp for relax and autopilot. The accuracy column is a
// single precision float, so it is compared rounded.
const rankOrder = (dodge: boolean, relax: number) =>
  dodge
    ? 'ROUND(s.accuracy, 4) DESC, s.score ASC, s.time ASC, s.id ASC'
    : `${relax === 0 ? 's.score' : 's.pp'} DESC, s.time ASC, s.id ASC`;

// The play each player keeps as their best is the one the map's own rule picks.
const bestOrder = (dodge: boolean) =>
  dodge
    ? 'ROUND(accuracy, 4) DESC, score ASC, time ASC, id ASC'
    : 'pp DESC, score DESC, time ASC, id ASC';

// Marking a map, or unmarking it, changes what its scores mean, so the ones already on it follow: the accuracy
// swaps between the share caught and the share avoided, each player's best play is picked again, and the
// first places are rebuilt from the new order.
export async function reorderBoards(
  tx: Prisma.TransactionClient,
  md5: string,
  dodge: boolean,
  hasLeaderboard: boolean
) {
  for (const { table, relax } of BOARDS) {
    await tx.$executeRawUnsafe(
      `UPDATE ${table} SET accuracy = 100 - accuracy WHERE beatmap_md5 = ?`,
      md5
    );
    await tx.$executeRawUnsafe(
      `UPDATE ${table} s
       JOIN (SELECT id, ROW_NUMBER() OVER (PARTITION BY userid, play_mode ORDER BY ${bestOrder(dodge)}) AS rn
             FROM ${table} WHERE beatmap_md5 = ? AND completed IN (2, 3)) r ON r.id = s.id
       SET s.completed = IF(r.rn = 1, 3, 2)`,
      md5
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM first_places WHERE beatmap_md5 = ? AND relax = ?',
      md5,
      relax
    );
    if (!hasLeaderboard) continue;

    await tx.$executeRawUnsafe(
      `INSERT INTO first_places (score_id, user_id, score, max_combo, full_combo, mods, \`300_count\`,
         \`100_count\`, \`50_count\`, cgekis_count, ckatus_count, miss_count, timestamp, mode, completed,
         accuracy, pp, play_time, beatmap_md5, relax)
       SELECT id, userid, score, max_combo, full_combo, mods, \`300_count\`, \`100_count\`, \`50_count\`,
         gekis_count, katus_count, misses_count, time, play_mode, completed, accuracy, pp, playtime,
         beatmap_md5, ?
       FROM (SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.play_mode ORDER BY ${rankOrder(dodge, relax)}) AS rn
             FROM ${table} s JOIN users u ON u.id = s.userid
             WHERE s.beatmap_md5 = ? AND s.completed = 3 AND u.privileges & 1 > 0) t
       WHERE rn = 1`,
      relax,
      md5
    );
  }
}

// A dodge the beat difficulty is played by avoiding every object, so the game servers rank its board by how much
// was avoided and never award pp for it. Only catch maps can be one.
export async function setDodgeTheBeat(by: Ranker, beatmapId: number, on: boolean) {
  const row = await db.beatmaps.findFirst({
    where: { beatmap_id: beatmapId, ranked: { not: -1 } },
    select: { mode: true, beatmap_md5: true, song_name: true, ranked: true, dodge_the_beat: true }
  });
  if (!row) throw new Failure(404, 'Beatmap not found.');
  if (row.mode !== CATCH) throw new Failure(400, 'Only catch difficulties can be dodge the beat.');
  if (!rankableModes(by.privileges).includes(CATCH)) {
    throw new Failure(403, 'Insufficient privileges to change catch beatmaps.');
  }
  if (row.dodge_the_beat === on) return;

  await db.$transaction(async (tx) => {
    await tx.beatmaps.updateMany({
      where: { beatmap_id: beatmapId },
      data: { dodge_the_beat: on }
    });
    await reorderBoards(tx, row.beatmap_md5, on, row.ranked >= 2);
  });
  await refresh([row.beatmap_md5]);
  await rapLog(
    by.id,
    `${on ? 'marked' : 'unmarked'} the beatmap ${row.song_name} (${beatmapId}) as dodge the beat`
  );
}

const MAX_OFFSET = 1000;

// The clients add this many milliseconds to the map's audio timing, and the leaderboard response carries it.
export async function setOnlineOffset(by: Ranker, beatmapId: number, ms: number) {
  if (!Number.isInteger(ms) || Math.abs(ms) > MAX_OFFSET) {
    throw new Failure(
      400,
      `The offset must be a whole number of milliseconds within ${MAX_OFFSET}.`
    );
  }
  const row = await db.beatmaps.findFirst({
    where: { beatmap_id: beatmapId, ranked: { not: -1 } },
    select: { mode: true, beatmap_md5: true, song_name: true }
  });
  if (!row) throw new Failure(404, 'Beatmap not found.');
  if (!rankableModes(by.privileges).includes(row.mode)) {
    throw new Failure(403, `Insufficient privileges to change mode ${row.mode} beatmaps.`);
  }

  await db.beatmaps.updateMany({ where: { beatmap_id: beatmapId }, data: { online_offset: ms } });
  await refresh([row.beatmap_md5]);
  await rapLog(by.id, `set the online offset of ${row.song_name} (${beatmapId}) to ${ms}ms`);
}
