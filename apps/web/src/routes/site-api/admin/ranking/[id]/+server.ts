import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf, idOf } from '$server/admin/common';
import {
  loadSet,
  rankDifficulty,
  rankSet,
  setDodgeTheBeat,
  setOnlineOffset,
  STATUSES
} from '$server/admin/ranking';
import type { StatusName } from '$server/admin/ranking';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params, url }) => {
  const caller = await requirePrivilege(request, Privilege.AdminAccessRap);
  return ok(await loadSet(idOf(params), caller.privileges, url.searchParams.has('set')));
});

interface Body {
  all: StatusName;
  changes: { beatmapId: number; status: StatusName }[];
  dodge?: { beatmapId: number; on: boolean };
  offset?: { beatmapId: number; ms: number };
}

// Either the whole set moves to one status, a list of single difficulties does, or one difficulty is marked
// as dodge the beat, or one is given an online offset.
export const POST = handle(async ({ request, params, url }) => {
  const caller = await requirePrivilege(request, Privilege.AdminAccessRap);
  const id = idOf(params);
  const body = await bodyOf<Body>(request);
  const user = await db.users.findUnique({ where: { id: caller.id }, select: { username: true } });
  const by = {
    id: caller.id,
    username: user?.username ?? String(caller.id),
    privileges: caller.privileges
  };

  if (body.dodge) {
    await setDodgeTheBeat(by, Number(body.dodge.beatmapId), Boolean(body.dodge.on));
    return ok();
  }

  if (body.offset) {
    await setOnlineOffset(by, Number(body.offset.beatmapId), Number(body.offset.ms));
    return ok();
  }

  if (body.all) {
    if (!(body.all in STATUSES)) throw new Failure(400, 'auth.validation_error');
    const { setId } = await loadSet(id, caller.privileges, url.searchParams.has('set'));
    await rankSet(by, setId, STATUSES[body.all]);
    return ok();
  }

  for (const change of body.changes ?? []) {
    if (!(change.status in STATUSES)) throw new Failure(400, 'auth.validation_error');
    await rankDifficulty(by, Number(change.beatmapId), STATUSES[change.status]);
  }
  return ok();
});
