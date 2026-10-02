import { db } from './db';

// Profiles open by ID, by current name or by a name the player used to have, as on Hanayo.
export async function resolveUser(name: string) {
  const safe = name.toLowerCase().replaceAll(' ', '_');
  const literal = name.replace(/[\\%_]/g, (character) => `\\${character}`);
  const byId = /^\d+$/.test(name) ? Number(name) : -1;
  const rows = await db.$queryRaw<{ id: number }[]>`
    SELECT id FROM users
    WHERE username_safe = ${safe} OR id = ${byId}
      OR id IN (SELECT user_id FROM user_name_history WHERE username LIKE ${literal})
    ORDER BY id = ${byId} DESC, username_safe = ${safe} DESC
    LIMIT 1`;
  return rows[0]?.id ?? null;
}
