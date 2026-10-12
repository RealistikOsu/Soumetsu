import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { rapLog } from '$server/admin/log';
import { publishPost } from '$server/news';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageDocs);
  const post = await publishPost(params.slug ?? '');
  await rapLog(caller.id, `has published the news post "${post.title}" (${post.slug})`);
  return ok(post);
});
