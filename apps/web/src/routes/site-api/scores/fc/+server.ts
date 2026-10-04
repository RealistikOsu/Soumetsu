import type { Mod } from '$lib/mods';
import { requireCaller } from '$server/auth';
import { fullComboPp, isKnownMod, type Counts } from '$server/pp';
import { Failure, handle, ok } from '$server/respond';

const MAX_ID = 2_147_483_647;
// More hit objects than any map has, so nonsense never reaches the database or the performance service.
const MAX_COUNT = 100_000;

const isMod = (mod: unknown): mod is Mod => {
  if (typeof mod !== 'object' || mod === null) return false;
  const { acronym, settings } = mod as { acronym?: unknown; settings?: unknown };
  if (typeof acronym !== 'string' || !isKnownMod(acronym)) return false;
  if (settings === null || settings === undefined) return true;
  if (typeof settings !== 'object') return false;
  const rate = (settings as { speed_change?: unknown }).speed_change;
  return rate === undefined || (typeof rate === 'number' && rate >= 0.5 && rate <= 2);
};

export const POST = handle(async ({ request }) => {
  await requireCaller(request);
  const body = (await request.json().catch(() => null)) as {
    beatmapId?: unknown;
    mode?: unknown;
    mods?: unknown;
    counts?: Record<string, unknown>;
  } | null;
  const counts = body?.counts;
  const keys: (keyof Counts)[] = ['n300', 'n100', 'n50', 'geki', 'katu', 'miss'];
  if (
    !body ||
    typeof body.beatmapId !== 'number' ||
    !Number.isInteger(body.beatmapId) ||
    body.beatmapId < 1 ||
    body.beatmapId > MAX_ID ||
    typeof body.mode !== 'number' ||
    ![0, 1, 2, 3].includes(body.mode) ||
    !Array.isArray(body.mods) ||
    body.mods.length > 20 ||
    !body.mods.every(isMod) ||
    !counts ||
    !keys.every((key) => {
      const n = counts[key];
      return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_COUNT;
    })
  ) {
    throw new Failure(400, 'site.invalid_request');
  }

  const clean: Mod[] = body.mods.map((mod) => ({
    acronym: mod.acronym,
    settings: mod.settings?.speed_change ? { speed_change: mod.settings.speed_change } : null
  }));
  return ok(await fullComboPp(body.beatmapId, body.mode, clean, counts as unknown as Counts));
});
