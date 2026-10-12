import { readFile, stat } from 'node:fs/promises';
import { error } from '@sveltejs/kit';
import { coverFile } from '$server/news';

export const GET = async ({ params }) => {
  const cover = coverFile(params.file);
  const info = cover && (await stat(cover.path).catch(() => null));
  if (!cover || !info?.isFile()) error(404);
  return new Response(new Uint8Array(await readFile(cover.path)), {
    // A new cover gets saved under the same name, so caches only hold it for a day.
    headers: { 'Content-Type': cover.type, 'Cache-Control': 'public, max-age=86400' }
  });
};
