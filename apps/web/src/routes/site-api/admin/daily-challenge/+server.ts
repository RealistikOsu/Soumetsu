import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import {
  dailyChallenges,
  removeDailyChallenge,
  setDailyChallenge
} from '$server/admin/daily-challenge';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageBeatmap);
  return ok(await dailyChallenges());
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBeatmap);
  const { date, beatmap_id, starts_at } = await bodyOf<{
    date: string;
    beatmap_id: number;
    starts_at: string | null;
  }>(request);
  if (typeof date !== 'string' || !Number.isInteger(beatmap_id) || beatmap_id! < 1) {
    throw new Failure(400, 'site.invalid_request');
  }
  await setDailyChallenge(caller.id, date, beatmap_id!, starts_at);
  return ok();
});

export const DELETE = handle(async ({ request, url }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageBeatmap);
  await removeDailyChallenge(caller.id, url.searchParams.get('date') ?? '');
  return ok();
});
