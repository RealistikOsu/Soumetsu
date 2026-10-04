import type { Mod } from '$lib/mods';
import { fullComboPp, type Counts } from '$server/pp';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const body = (await request.json().catch(() => null)) as {
    beatmapId?: number;
    mode?: number;
    mods?: Mod[];
    counts?: Counts;
  } | null;
  const counts = body?.counts;
  if (
    !body ||
    !Number.isInteger(body.beatmapId) ||
    ![0, 1, 2, 3].includes(body.mode ?? -1) ||
    !Array.isArray(body.mods) ||
    !counts ||
    !Object.values(counts).every((n) => Number.isInteger(n) && n >= 0)
  ) {
    throw new Failure(400, 'site.invalid_request');
  }
  return ok(await fullComboPp(body.beatmapId!, body.mode!, body.mods, counts));
});
