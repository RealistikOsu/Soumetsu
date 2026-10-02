import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { coverOf, creatorOf, splitName } from '$server/admin/ranking';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

// The most played maps nobody has ranked yet, as the panel suggested them.
export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminAccessRap);
  const top = await db.beatmaps.findMany({
    where: { ranked: 0 },
    orderBy: { playcount: 'desc' },
    take: 8,
    select: { beatmap_id: true, song_name: true, beatmapset_id: true, playcount: true }
  });

  const suggestions = await Promise.all(
    top.map(async (map) => {
      const [siblings, creator] = await Promise.all([
        db.beatmaps.findMany({
          where: { beatmapset_id: map.beatmapset_id },
          select: { mode: true }
        }),
        creatorOf(map.beatmapset_id)
      ]);
      const { song, diff } = splitName(map.song_name);
      return {
        beatmapId: map.beatmap_id,
        song,
        diff,
        creator,
        cover: coverOf(map.beatmapset_id),
        playcount: map.playcount,
        difficulties: siblings.length,
        modes: [...new Set(siblings.map((s) => s.mode))].sort()
      };
    })
  );
  return ok(suggestions);
});
