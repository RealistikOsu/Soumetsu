import { gradeOf } from '$lib/grades';
import { db } from '$server/db';
import { modList } from '$server/mods';

const TABLES = ['scores', 'scores_relax', 'scores_ap'];

interface Row {
  id: number;
  username: string;
  userid: number;
  country: string;
  time: string;
  score: bigint;
  pp: number;
  play_mode: number;
  mods: number;
  playback_rate: string;
  accuracy: number;
  song_name: string;
  beatmap_id: number;
  completed: number;
  count_300: number;
  count_100: number;
  count_50: number;
  count_misses: number;
}

// The newest plays by public players across vanilla, relax and autopilot, a fair share from each.
export async function latestPlays(total: number, minPp: number) {
  const each = Math.floor(total / TABLES.length);
  const rows = await Promise.all(
    TABLES.map(async (table, custom) =>
      (
        await db.$queryRawUnsafe<Row[]>(
          `SELECT s.id, u.username, s.userid, u.country, s.time, s.score, s.pp, s.play_mode, s.mods,
                  s.playback_rate, s.accuracy, b.song_name, b.beatmap_id, s.completed,
                  s.300_count AS count_300, s.100_count AS count_100, s.50_count AS count_50,
                  s.misses_count AS count_misses
           FROM ${table} s
           INNER JOIN users u ON u.id = s.userid
           INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5
           WHERE u.privileges & 1 AND s.pp >= ?
           ORDER BY s.id DESC LIMIT ?`,
          minPp,
          each
        )
      ).map((row) => ({ row, custom }))
    )
  );

  return rows
    .flat()
    .sort((a, b) => Number(b.row.time) - Number(a.row.time))
    .map(({ row, custom }) => {
      const mods = modList(row.mods, Number(row.playback_rate));
      return {
        id: row.id,
        custom,
        userid: row.userid,
        username: row.username,
        country: row.country,
        time: Number(row.time),
        pp: row.pp,
        accuracy: row.accuracy,
        song_name: row.song_name,
        beatmap_id: row.beatmap_id,
        mods,
        grade: gradeOf({ ...row, mods })
      };
    });
}
