import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

const TABLES = ['scores', 'scores_relax', 'scores_ap'];
const DIFFICULTY = ['difficulty_std', 'difficulty_taiko', 'difficulty_ctb', 'difficulty_mania'];

interface Row {
  id: number;
  beatmap_md5: string;
  player_id: number;
  score: bigint;
  max_combo: number;
  full_combo: number;
  mods: number;
  count_300: number;
  count_100: number;
  count_50: number;
  count_katus: number;
  count_gekis: number;
  count_misses: number;
  submitted_at: string;
  play_mode: number;
  completed: number;
  accuracy: number;
  pp: number;
  playtime: number;
  playback_rate: string;
  watched_count: number;
  beatmap_id: number;
  beatmapset_id: number;
  song_name: string;
  difficulty: number;
  ranked: number;
}

const MODS = [
  'NF',
  'EZ',
  'TD',
  'HD',
  'HR',
  'SD',
  'DT',
  'RX',
  'HT',
  'NC',
  'FL',
  'AT',
  'SO',
  'AP',
  'PF',
  'K4',
  'K5',
  'K6',
  'K7',
  'K8',
  'FI',
  'RD',
  'CN',
  'TG',
  'K9',
  'KC',
  'K1',
  'K3',
  'K2',
  'V2',
  'MR'
];

// Same shape the API gives for a mod list: CL first, NC replacing DT, speed on the rate-changing mods.
function modList(bits: number, rate: number) {
  const mods: {
    acronym: string;
    settings: { speed_change: number; adjust_pitch: boolean } | null;
  }[] = [{ acronym: 'CL', settings: null }];
  const withoutDt = bits & (1 << 9) ? bits & ~(1 << 6) : bits;
  MODS.forEach((acronym, i) => {
    if (!(withoutDt & (1 << i))) return;
    const speed = ['DT', 'HT', 'NC'].includes(acronym);
    mods.push({
      acronym,
      settings: speed
        ? { speed_change: Math.round(rate * 100) / 100, adjust_pitch: acronym === 'NC' }
        : null
    });
  });
  return mods;
}

export const GET = handle(async ({ params, url }) => {
  const id = Number(params.id);
  const mode = Number(url.searchParams.get('mode') ?? 0);
  const custom = Number(url.searchParams.get('custom_mode') ?? 0);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit') ?? 5)), 50);
  if (!Number.isInteger(id) || !DIFFICULTY[mode] || !TABLES[custom]) {
    throw new Failure(400, 'site.invalid_request');
  }

  const user = await db.users.findUnique({ where: { id }, select: { privileges: true } });
  if (!user) throw new Failure(404, 'scores.user_not_found');
  if ((Number(user.privileges) & 1) === 0) throw new Failure(403, 'scores.user_restricted');

  // Both names come from the fixed lists above, never from the request.
  const rows = await db.$queryRawUnsafe<Row[]>(
    `SELECT s.id, s.beatmap_md5, s.userid AS player_id, s.score, s.max_combo, s.full_combo, s.mods,
            s.300_count AS count_300, s.100_count AS count_100, s.50_count AS count_50,
            s.katus_count AS count_katus, s.gekis_count AS count_gekis,
            s.misses_count AS count_misses, s.time AS submitted_at, s.play_mode, s.completed,
            s.accuracy, s.pp, s.playtime, s.playback_rate, s.watched_count,
            b.beatmap_id, b.beatmapset_id, b.song_name, b.${DIFFICULTY[mode]} AS difficulty, b.ranked
     FROM ${TABLES[custom]} s
     INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5
     WHERE s.userid = ? AND s.play_mode = ? AND s.completed = 3 AND s.watched_count > 0
     ORDER BY s.watched_count DESC
     LIMIT ? OFFSET ?`,
    id,
    mode,
    limit,
    (page - 1) * limit
  );

  return ok(
    rows.map((row) => ({
      id: row.id,
      beatmap_md5: row.beatmap_md5,
      player_id: row.player_id,
      score: Number(row.score),
      max_combo: row.max_combo,
      full_combo: row.full_combo !== 0,
      mods: modList(row.mods, Number(row.playback_rate)),
      count_300: row.count_300,
      count_100: row.count_100,
      count_50: row.count_50,
      count_katus: row.count_katus,
      count_gekis: row.count_gekis,
      count_misses: row.count_misses,
      submitted_at: Number(row.submitted_at),
      play_mode: row.play_mode,
      completed: row.completed,
      accuracy: row.accuracy,
      pp: row.pp,
      playtime: row.playtime,
      watched_count: row.watched_count,
      beatmap: {
        beatmap_id: row.beatmap_id,
        beatmapset_id: row.beatmapset_id,
        song_name: row.song_name,
        difficulty: row.difficulty,
        ranked: row.ranked
      }
    }))
  );
});
