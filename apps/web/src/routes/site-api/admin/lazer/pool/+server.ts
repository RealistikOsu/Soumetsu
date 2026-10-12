import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { addPoolEntry, poolEntries, removePoolEntry } from '$server/admin/lazer';
import { Failure, handle, ok } from '$server/respond';

const rulesetOf = (value: unknown) => {
  const ruleset = Number(value);
  if (!Number.isInteger(ruleset) || ruleset < 0 || ruleset > 3) {
    throw new Failure(400, 'site.invalid_request');
  }
  return ruleset;
};

// Only osu! has a relax ranked play pool.
const variantOf = (value: unknown, ruleset: number) => {
  const variant = Number(value ?? 0);
  if (variant !== 0 && !(variant === 1 && ruleset === 0)) {
    throw new Failure(400, 'site.invalid_request');
  }
  return variant;
};

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminManageBeatmap);
  const ruleset = rulesetOf(url.searchParams.get('ruleset'));
  return ok(await poolEntries(ruleset, variantOf(url.searchParams.get('variant'), ruleset)));
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBeatmap);
  const body = await bodyOf<{
    ruleset: number;
    variant: number;
    beatmap_id: number;
    stars: number;
  }>(request);
  if (!Number.isInteger(body.beatmap_id) || body.beatmap_id! < 1) {
    throw new Failure(400, 'site.invalid_request');
  }
  const ruleset = rulesetOf(body.ruleset);
  await addPoolEntry(
    caller.id,
    ruleset,
    variantOf(body.variant, ruleset),
    body.beatmap_id!,
    body.stars
  );
  return ok();
});

export const DELETE = handle(async ({ request, url }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBeatmap);
  const beatmapId = Number(url.searchParams.get('beatmap'));
  if (!Number.isInteger(beatmapId) || beatmapId < 1) throw new Failure(400, 'site.invalid_request');
  const ruleset = rulesetOf(url.searchParams.get('ruleset'));
  await removePoolEntry(
    caller.id,
    ruleset,
    variantOf(url.searchParams.get('variant'), ruleset),
    beatmapId
  );
  return ok();
});
