import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import { deletePost, getPost, savePost } from '$server/news';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params }) => {
  await requirePrivilege(request, Privilege.AdminManageDocs);
  const post = await getPost(params.slug ?? '', { drafts: true });
  if (!post) throw new Failure(404, 'news.not_found');
  return ok(post);
});

export const PUT = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageDocs);
  const body = await bodyOf<{
    title: string;
    preview: string;
    body: string;
    previous: string;
    create: boolean;
  }>(request);
  const post = await savePost(
    params.slug ?? '',
    { title: body.title ?? '', preview: body.preview ?? '', body: body.body ?? '' },
    caller.id,
    body.previous,
    body.create === true
  );
  await rapLog(caller.id, `has edited the news post "${post.title}" (${post.slug})`);
  return ok(post);
});

export const DELETE = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageDocs);
  await deletePost(params.slug ?? '');
  await rapLog(caller.id, `has deleted the news post ${params.slug ?? ''}`);
  return ok();
});
