import { Privilege } from '$lib/auth/privileges';
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

interface Row {
  beatmap_id: number;
  beatmapset_id: number;
  beatmap_md5: string;
  song_name: string;
  mode: number;
  difficulty_std: number;
  ranked: number;
  max_combo: number | null;
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

// An id can name a single difficulty or a whole set, the panel took either.
export async function loadSet(id: number, privileges: number) {
  const diff = await db.beatmaps.findFirst({
    where: { beatmap_id: id },
    select: { beatmapset_id: true }
  });
  const setId = diff?.beatmapset_id ?? id;

  const all = await db.$queryRaw<Row[]>`
    SELECT beatmap_id, beatmapset_id, beatmap_md5, song_name, mode, difficulty_std, ranked, max_combo
    FROM beatmaps WHERE beatmapset_id = ${setId}`;
  if (!all.length) throw new Failure(404, 'Beatmap not found.');

  const modes = rankableModes(privileges);
  const rows = all.filter((row) => modes.includes(row.mode));
  if (!rows.length) throw new Failure(403, 'You do not have permission to rank this beatmap.');

  const [stars, creator] = await Promise.all([starRatings(rows), creatorOf(setId)]);
  return {
    setId,
    title: splitName(all[0].song_name).song,
    creator,
    cover: coverOf(setId),
    difficulties: rows
      .map((row) => ({
        id: row.beatmap_id,
        name: splitName(row.song_name).diff,
        mode: row.mode,
        stars: stars.get(row.beatmap_id) ?? row.difficulty_std,
        ranked: row.ranked
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

const refresh = (md5s: string[]) =>
  Promise.all(md5s.map((md5) => redis.publish('ussr:refresh_bmap', md5)));

export async function rankSet(by: Ranker, setId: number, status: number) {
  const present = await db.beatmaps.findMany({
    where: { beatmapset_id: setId },
    select: { beatmap_md5: true, beatmap_id: true, song_name: true, mode: true }
  });
  if (!present.length) throw new Failure(404, 'Beatmap not found.');

  const modes = rankableModes(by.privileges);
  if (!present.some((row) => modes.includes(row.mode))) {
    throw new Failure(403, 'Insufficient privileges to rank this beatmapset.');
  }

  await db.beatmaps.updateMany({
    where: { beatmapset_id: setId, mode: { in: modes } },
    data: { ranked: status, ranked_status_freezed: true }
  });
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
  await clearRequests(row.beatmapset_id, [beatmapId]);
  await announce(by, row.beatmapset_id, beatmapId, row.song_name, status);
  await refresh([row.beatmap_md5]);
  await rapLog(by.id, `${verb[status]} the beatmap ${row.song_name} (${beatmapId})`);
}
