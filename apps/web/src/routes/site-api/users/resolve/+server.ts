import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

// Profiles open by ID, by current name or by a name the player used to have, as on Hanayo.
export const GET = handle(async ({ url }) => {
  const name = url.searchParams.get('name')?.trim();
  if (!name) throw new Failure(400, 'site.invalid_request');

  const safe = name.toLowerCase().replaceAll(' ', '_');
  const byId = /^\d+$/.test(name) ? Number(name) : -1;
  const rows = await db.$queryRaw<{ id: number }[]>`
    SELECT id FROM users
    WHERE username_safe = ${safe} OR id = ${byId}
      OR id IN (SELECT user_id FROM user_name_history WHERE username LIKE ${name})
    ORDER BY id = ${byId} DESC, username_safe = ${safe} DESC
    LIMIT 1`;
  if (!rows[0]) throw new Failure(404, 'users.user_not_found');
  return ok(rows[0].id);
});
