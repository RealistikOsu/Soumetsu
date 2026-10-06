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

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminManageBeatmap);
  return ok(await poolEntries(rulesetOf(url.searchParams.get('ruleset'))));
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBeatmap);
  const body = await bodyOf<{ ruleset: number; beatmap_id: number; stars: number }>(request);
  if (!Number.isInteger(body.beatmap_id) || body.beatmap_id! < 1) {
    throw new Failure(400, 'site.invalid_request');
  }
  await addPoolEntry(caller.id, rulesetOf(body.ruleset), body.beatmap_id!, body.stars);
  return ok();
});

export const DELETE = handle(async ({ request, url }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBeatmap);
  const beatmapId = Number(url.searchParams.get('beatmap'));
  if (!Number.isInteger(beatmapId) || beatmapId < 1) throw new Failure(400, 'site.invalid_request');
  await removePoolEntry(caller.id, rulesetOf(url.searchParams.get('ruleset')), beatmapId);
  return ok();
});
