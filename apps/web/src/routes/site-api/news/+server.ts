import { authorsOf, listPosts, publicPost } from '$server/news';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 12));
  const all = await listPosts();
  const shown = all.slice((page - 1) * limit, page * limit);
  const authors = await authorsOf(shown);
  return ok({ posts: shown.map((post) => publicPost(post, authors)), total: all.length });
});
