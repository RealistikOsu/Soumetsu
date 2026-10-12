import { authorsOf, getPost, publicPost } from '$server/news';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ params }) => {
  const post = await getPost(params.slug ?? '');
  if (!post) throw new Failure(404, 'news.not_found');
  return ok({ ...publicPost(post, await authorsOf([post])), body: post.body });
});
