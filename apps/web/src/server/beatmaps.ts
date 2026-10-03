import { Privilege } from '$lib/auth/privileges';
import type { Caller } from './auth';
import { rapLog } from './admin/log';
import { db } from './db';
import { redis } from './redis';
import { Failure } from './respond';

const UPLOADED_FROM = 1_000_000_000;
const SCORE_TABLES = ['scores', 'scores_relax', 'scores_ap'];

// A set uploaded here can be deleted by its mapper or by a moderator, and only while nothing in it is ranked,
// qualified or loved: those have leaderboards and give pp. Its scores go with it.
export async function deleteUploadedSet(setId: number, caller: Caller) {
  const maps = await db.beatmaps.findMany({
    where: { beatmapset_id: setId },
    select: { beatmap_id: true, beatmap_md5: true, mapper_id: true, ranked: true }
  });
  if (!maps.length) throw new Failure(404, 'beatmaps.beatmap_not_found');

  const moderator = (caller.privileges & Privilege.AdminWipeUsers) !== 0;
  const own = maps.every((map) => map.mapper_id === caller.id);
  if (setId < UPLOADED_FROM || !(own || moderator)) {
    throw new Failure(403, 'beatmaps.delete_forbidden');
  }
  if (maps.some((map) => map.ranked >= 2)) throw new Failure(403, 'beatmaps.delete_ranked');

  const ids = maps.map((map) => map.beatmap_id);
  const md5s = maps.map((map) => map.beatmap_md5);
  const inMd5s = md5s.map(() => '?').join(',');
  const inIds = ids.map(() => '?').join(',');

  await db.$transaction(async (tx) => {
    for (const table of SCORE_TABLES) {
      await tx.$executeRawUnsafe(
        `DELETE p FROM user_pinned p INNER JOIN ${table} s ON s.id = p.scoreid
         WHERE s.beatmap_md5 IN (${inMd5s})`,
        ...md5s
      );
      await tx.$executeRawUnsafe(`DELETE FROM ${table} WHERE beatmap_md5 IN (${inMd5s})`, ...md5s);
    }
    await tx.$executeRawUnsafe(
      `DELETE FROM first_places WHERE beatmap_md5 IN (${inMd5s})`,
      ...md5s
    );
    await tx.$executeRawUnsafe(
      `DELETE FROM users_beatmap_playcount WHERE beatmap_id IN (${inIds})`,
      ...ids
    );
    await tx.$executeRawUnsafe(
      `DELETE FROM beatmap_rankers WHERE beatmap_id IN (${inIds})`,
      ...ids
    );
    await tx.$executeRawUnsafe(
      `DELETE FROM rank_requests WHERE (type = 's' AND bid = ?) OR (type = 'b' AND bid IN (${inIds}))`,
      setId,
      ...ids
    );
    await tx.$executeRawUnsafe('DELETE FROM beatmaps WHERE beatmapset_id = ?', setId);
  });

  // The score server drops its cached copies; the mirror takes the set out of search and storage.
  await Promise.all(md5s.map((md5) => redis.publish('ussr:refresh_bmap', md5)));
  await redis.publish('beatmap:delete', String(setId));

  if (!own) await rapLog(caller.id, `deleted the uploaded beatmap set ${setId}`);
}
