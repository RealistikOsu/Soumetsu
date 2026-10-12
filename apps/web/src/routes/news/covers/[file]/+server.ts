import { error } from '@sveltejs/kit';
import { coverFile } from '$server/news';

export const GET = async ({ params }) => {
  const cover = coverFile(params.file);
  const file = cover && Bun.file(cover.path);
  if (!cover || !file || !(await file.exists())) error(404);
  return new Response(file, {
    // A new cover gets saved under the same name, so caches only hold it for a day.
    headers: { 'Content-Type': cover.type, 'Cache-Control': 'public, max-age=86400' }
  });
};
