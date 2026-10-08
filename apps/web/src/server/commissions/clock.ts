import { db } from '$server/db';
import { clockFrom, type DayClock } from './day';
import { optional } from './scores';

const TTL = 60_000;
let cached: { clock: DayClock; at: number } | null = null;

// The schedule only changes when staff add a challenge, so a minute of staleness is fine. starts_at is a UTC
// DATETIME, read as text so the connection's time zone can't shift it.
export async function loadClock(): Promise<DayClock> {
  if (cached && cached.at + TTL > Date.now()) return cached.clock;
  const rows = await optional(db.$queryRaw<{ starts_at: string }[]>`
    SELECT DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i:%s') AS starts_at FROM lazer_daily_challenges
    WHERE starts_at >= UTC_TIMESTAMP() - INTERVAL 60 DAY ORDER BY starts_at`);
  const clock = clockFrom(rows.map((row) => new Date(`${row.starts_at}Z`)));
  cached = { clock, at: Date.now() };
  return clock;
}
