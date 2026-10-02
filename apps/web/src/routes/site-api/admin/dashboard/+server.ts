import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { counter } from '$server/admin/common';
import { db } from '$server/db';
import { modList } from '$server/mods';
import { handle, ok } from '$server/respond';

const TABLES = ['scores', 'scores_relax', 'scores_ap'];

interface Play {
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
  custom: number;
  completed: number;
}

// The same figures the panel's dashboard showed, plus what needs a staff member's attention.
export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminAccessRap);
  const week = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  const [
    registered,
    plays,
    scores,
    totalPp,
    pending,
    oldest,
    frozen,
    soonest,
    restricted,
    latestRestriction,
    activity
  ] = await Promise.all([
    counter('ripple:registered_users'),
    counter('ripple:total_plays'),
    counter('ripple:total_submitted_scores'),
    counter('ripple:total_pp'),
    db.rank_requests.count({ where: { blacklisted: false } }),
    db.rank_requests.findFirst({
      where: { blacklisted: false },
      orderBy: { id: 'asc' },
      select: { time: true }
    }),
    db.users.count({ where: { frozen: { not: 0 } } }),
    db.users.findFirst({
      where: { frozen: { not: 0 } },
      orderBy: { freezedate: 'asc' },
      select: { username: true, freezedate: true }
    }),
    db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM ban_logs WHERE UNIX_TIMESTAMP(ts) > ${week}`,
    db.$queryRaw<{ username: string; ts: number }[]>`
      SELECT u.username, UNIX_TIMESTAMP(b.ts) AS ts FROM ban_logs b INNER JOIN users u ON u.id = b.to_id
      ORDER BY b.id DESC LIMIT 1`,
    db.$queryRaw<
      { id: number; userid: number; username: string | null; text: string; datetime: number }[]
    >`
      SELECT l.id, l.userid, u.username, l.text, l.datetime FROM rap_logs l
      LEFT JOIN users u ON u.id = l.userid ORDER BY l.id DESC LIMIT 8`
  ]);

  // A few of the latest plays from each score table, public players only.
  const latest = (
    await Promise.all(
      TABLES.map((table, custom) =>
        db.$queryRawUnsafe<Play[]>(
          `SELECT s.id, u.username, s.userid, u.country, s.time, s.score, s.pp, s.play_mode, s.mods,
                  s.playback_rate, s.accuracy, b.song_name, b.beatmap_id, s.completed, ${custom} AS custom
           FROM ${table} s
           INNER JOIN users u ON u.id = s.userid
           INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5
           WHERE u.privileges & 1 AND s.pp >= 0
           ORDER BY s.id DESC LIMIT 7`
        )
      )
    )
  )
    .flat()
    .sort((a, b) => Number(b.time) - Number(a.time))
    .slice(0, 20)
    .map((p) => ({
      ...p,
      score: Number(p.score),
      time: Number(p.time),
      mods: modList(p.mods, Number(p.playback_rate))
    }));

  return ok({
    counters: { registered, plays, scores, totalPp },
    pendingRequests: { total: pending, oldest: oldest?.time ?? null },
    frozen: { total: frozen, soonest: soonest ?? null },
    restrictions: {
      week: Number(restricted[0]?.total ?? 0),
      latest: latestRestriction[0]
        ? { ...latestRestriction[0], ts: Number(latestRestriction[0].ts) }
        : null
    },
    activity,
    latest
  });
});
