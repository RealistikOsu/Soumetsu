import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

// Old links name the clan instead of numbering it.
export const GET = handle(async ({ url }) => {
  const name = url.searchParams.get('name')?.trim();
  if (!name) throw new Failure(400, 'site.invalid_request');

  const rows = await db.$queryRaw<
    { id: number }[]
  >`SELECT id FROM clans WHERE name = ${name} LIMIT 1`;
  if (!rows[0]) throw new Failure(404, 'clans.clan_not_found');
  return ok(rows[0].id);
});
