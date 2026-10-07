import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { rapLog } from './log';

const DIFFICULTY_COLUMNS = [
  'difficulty_std',
  'difficulty_taiko',
  'difficulty_ctb',
  'difficulty_mania'
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The lazer tables only exist once their migrations have run.
async function lazerTables<T>(query: Promise<T>) {
  return query.catch((error) => {
    if (String(error).includes("doesn't exist")) throw new Failure(404, 'site.not_configured');
    throw error;
  });
}

const today = () => new Date().toISOString().slice(0, 10);

// The lazer server rebuilds today's room when told the challenge changed.
const refreshToday = (date: string) =>
  date === today() ? redis.publish('rosu:lazer_daily_challenge', date) : null;

export interface DailyChallenge {
  date: string;
  beatmapId: number;
  song: string | null;
}

export async function dailyChallenges() {
  const rows = await lazerTables(
    db.$queryRaw<{ date: string; beatmap_id: number; song_name: string | null }[]>`
      SELECT DATE_FORMAT(c.challenge_date, '%Y-%m-%d') AS date, c.beatmap_id, b.song_name
      FROM lazer_daily_challenges c
      LEFT JOIN beatmaps b ON b.beatmap_id = c.beatmap_id
      WHERE c.challenge_date >= CURDATE() - INTERVAL 7 DAY
      ORDER BY c.challenge_date DESC`
  );
  return rows.map((row): DailyChallenge => ({
    date: row.date,
    beatmapId: row.beatmap_id,
    song: row.song_name
  }));
}

async function requireBeatmap(beatmapId: number) {
  const found = await db.beatmaps.count({ where: { beatmap_id: beatmapId } });
  if (!found) throw new Failure(404, 'beatmaps.beatmap_not_found');
}

export async function setDailyChallenge(staffId: number, date: string, beatmapId: number) {
  if (!DATE.test(date) || Number.isNaN(Date.parse(date)))
    throw new Failure(400, 'site.invalid_request');
  await requireBeatmap(beatmapId);

  await lazerTables(
    db.$executeRaw`
      INSERT INTO lazer_daily_challenges (challenge_date, beatmap_id) VALUES (${date}, ${beatmapId})
      ON DUPLICATE KEY UPDATE beatmap_id = ${beatmapId}`
  );
  await rapLog(staffId, `set the lazer daily challenge for ${date} to beatmap ${beatmapId}`);
  await refreshToday(date);
}

export async function removeDailyChallenge(staffId: number, date: string) {
  if (!DATE.test(date)) throw new Failure(400, 'site.invalid_request');

  await lazerTables(
    db.$executeRaw`DELETE FROM lazer_daily_challenges WHERE challenge_date = ${date}`
  );
  await rapLog(staffId, `removed the lazer daily challenge for ${date}`);
  await refreshToday(date);
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
