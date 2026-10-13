import { listPosts } from '$server/news';
import { handle, ok } from '$server/respond';

// Every published post, newest first, for the archive sidebar and the newer/older links.
export const GET = handle(async () =>
  ok(
    (await listPosts()).map((post) => ({
      slug: post.slug,
      title: post.title,
      published_at: post.publishedAt ?? post.updatedAt
    }))
  )
);
