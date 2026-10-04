import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, pageOf } from '$server/admin/common';
import { coverOf, rankableModes, setSummaries, splitName } from '$server/admin/ranking';
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

  // Two EXISTS let MySQL use the set and beatmap id indexes; one join with an OR scanned every beatmap.
  const where = `FROM rank_requests rr
    WHERE rr.blacklisted = 0 AND (
      EXISTS (SELECT 1 FROM beatmaps b
        WHERE rr.type = 's' AND b.beatmapset_id = rr.bid AND b.mode IN (${modes.join(',')}))
      OR EXISTS (SELECT 1 FROM beatmaps b
        WHERE rr.type = 'b' AND b.beatmap_id = rr.bid AND b.mode IN (${modes.join(',')})))`;
  const [rows, total] = await Promise.all([
    db.$queryRawUnsafe<Row[]>(
      `SELECT rr.id, rr.userid, rr.bid, rr.type, rr.time ${where}
       ORDER BY rr.id LIMIT ? OFFSET ?`,
      PAGE_SIZE,
      (page - 1) * PAGE_SIZE
    ),
    db.$queryRawUnsafe<{ total: bigint }[]>(`SELECT COUNT(*) AS total ${where}`)
  ]);

  const [maps, requesters] = await Promise.all([
    db.beatmaps.findMany({
      where: {
        OR: [
          { beatmapset_id: { in: rows.filter((r) => r.type === 's').map((r) => r.bid) } },
          { beatmap_id: { in: rows.filter((r) => r.type === 'b').map((r) => r.bid) } }
        ]
      },
      select: { beatmap_id: true, beatmapset_id: true, song_name: true }
    }),
    db.users.findMany({
      where: { id: { in: rows.map((r) => r.userid) } },
      select: { id: true, username: true, country: true }
    })
  ]);
  const sets = await setSummaries(maps.map((map) => map.beatmapset_id));

  const requests = rows.map((row) => {
    const map = maps.find((m) =>
      row.type === 's' ? m.beatmapset_id === row.bid : m.beatmap_id === row.bid
    );
    const requester = requesters.find((u) => u.id === row.userid);
    const set = map ? sets.get(map.beatmapset_id) : undefined;
    return {
      id: row.id,
      time: row.time,
      setId: map?.beatmapset_id ?? null,
      song: map ? splitName(map.song_name).song : 'Unknown beatmap',
      cover: map ? coverOf(map.beatmapset_id) : null,
      difficulties: set?.difficulties ?? 0,
      modes: set?.modes ?? [],
      requester: {
        id: row.userid,
        username: requester?.username ?? `Unknown! (${row.userid})`,
        country: requester?.country ?? 'XX'
      }
    };
  });

  return ok({ pages: Math.ceil(Number(total[0].total) / PAGE_SIZE), requests });
});
