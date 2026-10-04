import { db } from './db';

// Only supporters have a banner. An uploaded picture is the default for them, a solid colour when they
// chose one, and nothing when they chose none.
export function bannerOf(
  privileges: number,
  row: { type: number; value: string; pos_x: number; pos_y: number; zoom: number } | null
) {
  if ((privileges & 4) === 0) return null;
  if (!row) return null;
  if (row.type === 1) return { type: 1, value: null, x: row.pos_x, y: row.pos_y, zoom: row.zoom };
  // Colours saved by older sites weren't checked, and this one goes straight into a style attribute.
  return row.type === 2 && /^#[0-9a-f]{3,8}$/i.test(row.value)
    ? { type: 2, value: row.value }
    : null;
}

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
