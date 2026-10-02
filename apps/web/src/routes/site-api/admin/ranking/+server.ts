import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { SUGGESTIONS_KEY, coverOf, setSummaries, splitName } from '$server/admin/ranking';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { handle, ok } from '$server/respond';

// The most played maps nobody has ranked yet, as the panel suggested them. Finding them sorts every
// unranked beatmap, so the list is kept for a few minutes.
export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminAccessRap);
  const cached = await redis.get(SUGGESTIONS_KEY);
  if (cached) return ok(JSON.parse(cached));

  const top = await db.beatmaps.findMany({
    where: { ranked: 0 },
    orderBy: { playcount: 'desc' },
    take: 8,
    select: { beatmap_id: true, song_name: true, beatmapset_id: true, playcount: true }
  });
  const sets = await setSummaries(top.map((map) => map.beatmapset_id));

  const suggestions = top.map((map) => {
    const { song, diff } = splitName(map.song_name);
    const set = sets.get(map.beatmapset_id);
    return {
      beatmapId: map.beatmap_id,
      setId: map.beatmapset_id,
      song,
      diff,
      cover: coverOf(map.beatmapset_id),
      playcount: map.playcount,
      difficulties: set?.difficulties ?? 0,
      modes: set?.modes ?? []
    };
  });
  await redis.set(SUGGESTIONS_KEY, JSON.stringify(suggestions), 'EX', 300);
  return ok(suggestions);
});
