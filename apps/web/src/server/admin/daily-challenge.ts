import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { lazerTables } from './lazer';
import { rapLog } from './log';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY = 86_400_000;

export interface DailyChallenge {
  date: string;
  beatmapId: number;
  song: string | null;
  // UTC, as 'YYYY-MM-DDTHH:mm'. The challenge runs for 24 hours from it.
  startsAt: string;
  // Mods are allowed, except the speed mods, Relax and Autopilot, instead of the challenge being no-mod.
  freemod: boolean;
}

const asUtc = (value: string) => Date.parse(`${value.slice(0, 16)}:00Z`);

export async function dailyChallenges() {
  const rows = await lazerTables(
    db.$queryRaw<
      {
        date: string;
        beatmap_id: number;
        song_name: string | null;
        starts_at: string;
        freemod: number;
      }[]
    >`
      SELECT DATE_FORMAT(c.challenge_date, '%Y-%m-%d') AS date, c.beatmap_id, b.song_name,
             DATE_FORMAT(c.starts_at, '%Y-%m-%dT%H:%i') AS starts_at, c.freemod
      FROM lazer_daily_challenges c
      LEFT JOIN beatmaps b ON b.beatmap_id = c.beatmap_id
      WHERE c.challenge_date >= CURDATE() - INTERVAL 7 DAY
      ORDER BY c.starts_at DESC`
  );
  return rows.map((row): DailyChallenge => ({
    date: row.date,
    beatmapId: row.beatmap_id,
    song: row.song_name,
    startsAt: row.starts_at,
    freemod: !!row.freemod
  }));
}

// The lazer server and bancho follow the schedule, and the lazer server rebuilds the room when told it changed.
// That would restart a room that is in use, so it is only told when the change touches what is running now.
const refreshIfRunning = (starts: (string | null)[], date: string) => {
  const now = Date.now();
  const running = starts.some((start) => start && asUtc(start) <= now && now < asUtc(start) + DAY);
  return running ? redis.publish('rosu:lazer_daily_challenge', date) : null;
};

async function startOf(date: string) {
  const [row] = await lazerTables(
    db.$queryRaw<{ starts_at: string }[]>`
      SELECT DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i') AS starts_at
      FROM lazer_daily_challenges WHERE challenge_date = ${date}`
  );
  return row?.starts_at ?? null;
}

// A day has one challenge, so setting another start on the same UTC date replaces it.
export async function setDailyChallenge(
  staffId: number,
  starts: unknown,
  beatmapId: number,
  freemod: boolean
) {
  if (typeof starts !== 'string' || !MINUTE.test(starts) || Number.isNaN(asUtc(starts)))
    throw new Failure(400, 'site.invalid_request');
  const date = starts.slice(0, 10);

  // Stable and lazer share the challenge, and the leaderboards on both only cover osu!standard.
  const map = await db.beatmaps.findUnique({
    where: { beatmap_id: beatmapId },
    select: { mode: true }
  });
  if (!map) throw new Failure(404, 'beatmaps.beatmap_not_found');
  if (map.mode !== 0) throw new Failure(400, 'The daily challenge can only use osu!standard maps.');

  const before = await startOf(date);
  const startsAt = starts.replace('T', ' ');
  await lazerTables(
    db.$executeRaw`
      INSERT INTO lazer_daily_challenges (starts_at, beatmap_id, freemod)
      VALUES (${startsAt}, ${beatmapId}, ${freemod})
      ON DUPLICATE KEY UPDATE beatmap_id = ${beatmapId}, starts_at = ${startsAt}, freemod = ${freemod}`
  );
  await rapLog(
    staffId,
    `set the daily challenge starting ${starts} UTC to beatmap ${beatmapId}${freemod ? ' (freemod)' : ''}`
  );
  await refreshIfRunning([before, starts], date);
}

export async function removeDailyChallenge(staffId: number, date: string) {
  if (!DATE.test(date)) throw new Failure(400, 'site.invalid_request');

  const before = await startOf(date);
  await lazerTables(
    db.$executeRaw`DELETE FROM lazer_daily_challenges WHERE challenge_date = ${date}`
  );
  await rapLog(staffId, `removed the daily challenge for ${date}`);
  await refreshIfRunning([before], date);
}
