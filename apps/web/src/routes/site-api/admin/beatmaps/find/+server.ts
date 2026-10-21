import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { splitName } from '$server/admin/ranking';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

const idParam = (url: URL, name: string) => {
  const id = Number(url.searchParams.get(name));
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
};

// The difficulty and the set a search could mean, so the panel search can offer both.
export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminAccessRap);
  const beatmapId = idParam(url, 'beatmap');
  const setId = idParam(url, 'set');

  const [beatmap, set] = await Promise.all([
    beatmapId
      ? db.beatmaps.findFirst({
          where: { beatmap_id: beatmapId, ranked: { not: -1 } },
          select: { beatmap_id: true, beatmapset_id: true, song_name: true }
        })
      : null,
    setId
      ? db.beatmaps.findFirst({
          where: { beatmapset_id: setId, ranked: { not: -1 } },
          select: { beatmapset_id: true, song_name: true }
        })
      : null
  ]);

  return ok({
    beatmap: beatmap && {
      id: beatmap.beatmap_id,
      setId: beatmap.beatmapset_id,
      ...splitName(beatmap.song_name)
    },
    set: set && { id: set.beatmapset_id, song: splitName(set.song_name).song }
  });
});
