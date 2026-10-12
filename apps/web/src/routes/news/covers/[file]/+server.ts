import { readFile, stat } from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { coverFile, getPost } from '$server/news';

export const GET = async ({ params }) => {
  const cover = coverFile(params.file);
  // Drafts and orphaned files are not for the public.
  const post = cover && (await getPost(cover.slug));
  if (!cover || post?.cover !== params.file) error(404);
  const info = await stat(cover.path).catch(() => null);
  if (!info?.isFile()) error(404);
  return new Response(new Uint8Array(await readFile(cover.path)), {
    // A new cover gets saved under the same name, so caches only hold it for a day.
    headers: { 'Content-Type': cover.type, 'Cache-Control': 'public, max-age=86400' }
  });
};
