import { db } from '$server/db';
import { Failure } from '$server/respond';
import { rapLog } from './log';

const DIFFICULTY_COLUMNS = [
  'difficulty_std',
  'difficulty_taiko',
  'difficulty_ctb',
  'difficulty_mania'
];

// The lazer tables only exist once their migrations have run.
export async function lazerTables<T>(query: Promise<T>) {
  return query.catch((error) => {
    if (String(error).includes("doesn't exist")) throw new Failure(404, 'site.not_configured');
    throw error;
  });
}

export async function requireBeatmap(beatmapId: number) {
  const found = await db.beatmaps.count({ where: { beatmap_id: beatmapId } });
  if (!found) throw new Failure(404, 'beatmaps.beatmap_not_found');
}

// Read by the lazer server when a ranked play match ends; no row means on.
const RANKED_PLAY_ELO = 'lazer_ranked_play_elo';

export async function rankedPlayElo() {
  const row = await db.system_settings.findFirst({ where: { name: RANKED_PLAY_ELO } });
  return row ? row.value_int !== 0 : true;
}

export async function setRankedPlayElo(staffId: number, enabled: boolean) {
  const row = await db.system_settings.findFirst({ where: { name: RANKED_PLAY_ELO } });
  if (row) {
    await db.system_settings.update({
      where: { id: row.id },
      data: { value_int: Number(enabled) }
    });
  } else {
    await db.system_settings.create({
      data: { name: RANKED_PLAY_ELO, value_int: Number(enabled), value_string: '' }
    });
  }
  await rapLog(staffId, `turned ranked play rating changes ${enabled ? 'on' : 'off'}`);
}

export interface PoolEntry {
  beatmapId: number;
  stars: number;
  song: string | null;
}

export async function poolEntries(ruleset: number) {
  const rows = await lazerTables(
    db.$queryRaw<{ beatmap_id: number; star_rating: number; song_name: string | null }[]>`
      SELECT p.beatmap_id, p.star_rating, b.song_name
      FROM lazer_ranked_play_pool p
      LEFT JOIN beatmaps b ON b.beatmap_id = p.beatmap_id
      WHERE p.ruleset_id = ${ruleset}
      ORDER BY p.star_rating`
  );
  return rows.map((row): PoolEntry => ({
    beatmapId: row.beatmap_id,
    stars: row.star_rating,
    song: row.song_name
  }));
}

// Without a star rating the map's own difficulty for that ruleset is used.
export async function addPoolEntry(
  staffId: number,
  ruleset: number,
  beatmapId: number,
  stars?: number
) {
  await requireBeatmap(beatmapId);

  let rating = stars;
  if (!rating) {
    const column = DIFFICULTY_COLUMNS[ruleset];
    const [row] = await db.$queryRawUnsafe<{ stars: number }[]>(
      `SELECT ${column} AS stars FROM beatmaps WHERE beatmap_id = ?`,
      beatmapId
    );
    rating = Number(row?.stars);
  }
  if (!rating || rating <= 0) throw new Failure(400, 'site.invalid_request');

  await lazerTables(
    db.$executeRaw`
      INSERT INTO lazer_ranked_play_pool (ruleset_id, beatmap_id, star_rating)
      VALUES (${ruleset}, ${beatmapId}, ${rating})
      ON DUPLICATE KEY UPDATE star_rating = ${rating}`
  );
  await rapLog(
    staffId,
    `added beatmap ${beatmapId} to the lazer ranked play pool (ruleset ${ruleset})`
  );
}

export async function removePoolEntry(staffId: number, ruleset: number, beatmapId: number) {
  await lazerTables(
    db.$executeRaw`DELETE FROM lazer_ranked_play_pool WHERE ruleset_id = ${ruleset} AND beatmap_id = ${beatmapId}`
  );
  await rapLog(
    staffId,
    `removed beatmap ${beatmapId} from the lazer ranked play pool (ruleset ${ruleset})`
  );
}
