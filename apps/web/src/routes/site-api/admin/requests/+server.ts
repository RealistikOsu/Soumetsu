import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, pageOf } from '$server/admin/common';
import { coverOf, creatorOf, rankableModes, splitName } from '$server/admin/ranking';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

interface Row {
  id: number;
  userid: number;
  bid: number;
  type: string;
  time: number;
}

// Queued requests, limited to the modes the viewer may rank. A request names a set or a single difficulty.
export const GET = handle(async ({ request, url }) => {
  const caller = await requirePrivilege(request, Privilege.AdminAccessRap);
  const page = pageOf(url);
  const modes = rankableModes(caller.privileges);
  if (!modes.length) throw new Failure(403, 'You do not have permission to rank this beatmap.');

  const where = `FROM rank_requests rr
    INNER JOIN beatmaps b ON ((rr.type = 's' AND rr.bid = b.beatmapset_id)
      OR (rr.type = 'b' AND rr.bid = b.beatmap_id))
    WHERE rr.blacklisted = 0 AND b.mode IN (${modes.join(',')})`;
  const [rows, total] = await Promise.all([
    db.$queryRawUnsafe<Row[]>(
      `SELECT rr.id, rr.userid, rr.bid, rr.type, rr.time ${where}
       GROUP BY rr.id ORDER BY rr.id DESC LIMIT ? OFFSET ?`,
      PAGE_SIZE,
      (page - 1) * PAGE_SIZE
    ),
    db.$queryRawUnsafe<{ total: bigint }[]>(`SELECT COUNT(DISTINCT rr.id) AS total ${where}`)
  ]);

  const requests = await Promise.all(
    rows.map(async (row) => {
      const [map, requester] = await Promise.all([
        db.beatmaps.findFirst({
          where: row.type === 's' ? { beatmapset_id: row.bid } : { beatmap_id: row.bid },
          select: { beatmapset_id: true, song_name: true }
        }),
        db.users.findUnique({
          where: { id: row.userid },
          select: { username: true, country: true }
        })
      ]);
      const siblings = map
        ? await db.beatmaps.findMany({
            where: { beatmapset_id: map.beatmapset_id },
            select: { mode: true }
          })
        : [];
      return {
        id: row.id,
        time: row.time,
        setId: map?.beatmapset_id ?? null,
        song: map ? splitName(map.song_name).song : 'Unknown beatmap',
        cover: map ? coverOf(map.beatmapset_id) : null,
        creator: map ? await creatorOf(map.beatmapset_id) : null,
        difficulties: siblings.length,
        modes: [...new Set(siblings.map((s) => s.mode))].sort(),
        requester: {
          id: row.userid,
          username: requester?.username ?? `Unknown! (${row.userid})`,
          country: requester?.country ?? 'XX'
        }
      };
    })
  );

  return ok({ pages: Math.ceil(Number(total[0].total) / PAGE_SIZE), requests });
});
