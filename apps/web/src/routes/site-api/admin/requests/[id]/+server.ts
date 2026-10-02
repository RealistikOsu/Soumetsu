import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

// Takes a request out of the queue without touching the map.
export const DELETE = handle(async ({ request, params }) => {
  await requirePrivilege(request, Privilege.AdminManageBeatmap);
  await db.rank_requests.deleteMany({ where: { id: Number(params.id) } });
  return ok();
});
