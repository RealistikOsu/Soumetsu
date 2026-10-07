import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { lazerTables, requireBeatmap } from './lazer';
import { rapLog } from './log';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY = 86_400_000;

export interface DailyChallenge {
  date: string;
  beatmapId: number;
  song: string | null;
  // UTC, as 'YYYY-MM-DDTHH:mm'. Without them the challenge runs for its UTC day.
  startsAt: string | null;
  endsAt: string | null;
}

interface Row {
  date: string;
  beatmap_id: number;
  song_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

const asUtc = (value: string) => Date.parse(`${value.slice(0, 16)}:00Z`);

// A challenge runs for its UTC day unless it has its own window, and a start alone runs for 24 hours.
function windowOf(date: string, startsAt: string | null, endsAt: string | null) {
  const start = startsAt ? asUtc(startsAt) : Date.parse(`${date}T00:00:00Z`);
  return { start, end: endsAt ? asUtc(endsAt) : start + DAY };
}

const running = (window: { start: number; end: number }, now: number) =>
  window.start <= now && now < window.end;

export async function dailyChallenges() {
  const rows = await lazerTables(
    db.$queryRaw<Row[]>`
      SELECT DATE_FORMAT(c.challenge_date, '%Y-%m-%d') AS date, c.beatmap_id, b.song_name,
             DATE_FORMAT(c.starts_at, '%Y-%m-%dT%H:%i') AS starts_at,
             DATE_FORMAT(c.ends_at, '%Y-%m-%dT%H:%i') AS ends_at
      FROM lazer_daily_challenges c
      LEFT JOIN beatmaps b ON b.beatmap_id = c.beatmap_id
      WHERE c.challenge_date >= CURDATE() - INTERVAL 7 DAY
      ORDER BY c.challenge_date DESC`
  );
  return rows.map((row): DailyChallenge => ({
    date: row.date,
    beatmapId: row.beatmap_id,
    song: row.song_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at
  }));
}

// The lazer server and bancho follow the schedule, and the lazer server rebuilds the room when told it changed.
// That would restart a room that is in use, so it is only told when the change touches what is running now.
const refreshIfRunning = (windows: { start: number; end: number }[], date: string) =>
  windows.some((window) => running(window, Date.now()))
    ? redis.publish('rosu:lazer_daily_challenge', date)
    : null;

async function currentWindow(date: string) {
  const [row] = await lazerTables(
    db.$queryRaw<{ starts_at: string | null; ends_at: string | null }[]>`
      SELECT DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i') AS starts_at,
             DATE_FORMAT(ends_at, '%Y-%m-%dT%H:%i') AS ends_at
      FROM lazer_daily_challenges WHERE challenge_date = ${date}`
  );
  return row ? [windowOf(date, row.starts_at, row.ends_at)] : [];
}

const minute = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !MINUTE.test(value) || Number.isNaN(asUtc(value)))
    throw new Failure(400, 'site.invalid_request');
  return value;
};

export async function setDailyChallenge(
  staffId: number,
  date: string,
  beatmapId: number,
  starts: unknown,
  ends: unknown
) {
  if (!DATE.test(date) || Number.isNaN(Date.parse(date)))
    throw new Failure(400, 'site.invalid_request');
  const startsAt = minute(starts);
  const endsAt = minute(ends);
  const window = windowOf(date, startsAt, endsAt);
  if (window.end <= window.start) throw new Failure(400, 'site.invalid_request');
  await requireBeatmap(beatmapId);

  const before = await currentWindow(date);
  await lazerTables(
    db.$executeRaw`
      INSERT INTO lazer_daily_challenges (challenge_date, beatmap_id, starts_at, ends_at)
      VALUES (${date}, ${beatmapId}, ${startsAt?.replace('T', ' ') ?? null}, ${endsAt?.replace('T', ' ') ?? null})
      ON DUPLICATE KEY UPDATE beatmap_id = ${beatmapId},
        starts_at = ${startsAt?.replace('T', ' ') ?? null}, ends_at = ${endsAt?.replace('T', ' ') ?? null}`
  );
  const custom =
    startsAt || endsAt ? `, from ${startsAt ?? date} to ${endsAt ?? 'a day later'} UTC` : '';
  await rapLog(staffId, `set the daily challenge for ${date} to beatmap ${beatmapId}${custom}`);
  await refreshIfRunning([...before, window], date);
}

export async function removeDailyChallenge(staffId: number, date: string) {
  if (!DATE.test(date)) throw new Failure(400, 'site.invalid_request');

  const before = await currentWindow(date);
  await lazerTables(
    db.$executeRaw`DELETE FROM lazer_daily_challenges WHERE challenge_date = ${date}`
  );
  await rapLog(staffId, `removed the daily challenge for ${date}`);
  await refreshIfRunning(before, date);
}
