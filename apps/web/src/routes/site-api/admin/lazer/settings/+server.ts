import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { rankedPlayElo, setRankedPlayElo } from '$server/admin/lazer';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok({ rankedPlayElo: await rankedPlayElo() });
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageSetting);
  const { rankedPlayElo: enabled } = await bodyOf<{ rankedPlayElo: unknown }>(request);
  if (typeof enabled !== 'boolean') throw new Failure(400, 'site.invalid_request');
  await setRankedPlayElo(caller.id, enabled);
  return ok();
});
