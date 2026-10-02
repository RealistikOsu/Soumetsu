import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf, idOf } from '$server/admin/common';
import { loadSet, rankDifficulty, rankSet, STATUSES } from '$server/admin/ranking';
import type { StatusName } from '$server/admin/ranking';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminAccessRap);
  return ok(await loadSet(idOf(params), caller.privileges));
});

interface Body {
  all: StatusName;
  changes: { beatmapId: number; status: StatusName }[];
}

// Either the whole set moves to one status, or a list of single difficulties does.
export const POST = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminAccessRap);
  const id = idOf(params);
  const body = await bodyOf<Body>(request);
  const user = await db.users.findUnique({ where: { id: caller.id }, select: { username: true } });
  const by = {
    id: caller.id,
    username: user?.username ?? String(caller.id),
    privileges: caller.privileges
  };

  if (body.all) {
    if (!(body.all in STATUSES)) throw new Failure(400, 'auth.validation_error');
    const { setId } = await loadSet(id, caller.privileges);
    await rankSet(by, setId, STATUSES[body.all]);
    return ok();
  }

  for (const change of body.changes ?? []) {
    if (!(change.status in STATUSES)) throw new Failure(400, 'auth.validation_error');
    await rankDifficulty(by, Number(change.beatmapId), STATUSES[change.status]);
  }
  return ok();
});
