import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { listPosts } from '$server/news';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageDocs);
  return ok(await listPosts({ drafts: true }));
});
