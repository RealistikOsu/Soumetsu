import { decorations } from '$lib/decorations';
import { db } from '$server/db';

const DONOR = 4;
const ADMIN_ACCESS_RAP = 8;

export interface Entitlements {
  privileges: number;
  owned: string[];
}

// Owned styles stay pickable whatever happens to the tag that once unlocked them.
export function pickable(key: string, e: Entitlements): boolean {
  const decoration = decorations.find((d) => d.key === key);
  if (!decoration) return false;
  if (decoration.tier === 'everyone') return true;
  if (e.owned.includes(key)) return true;
  if (decoration.tier === 'supporter') return (e.privileges & DONOR) !== 0;
  if (decoration.tier === 'staff') return (e.privileges & ADMIN_ACCESS_RAP) !== 0;
  return false;
}

export async function ownedKeys(userId: number): Promise<string[]> {
  const rows = await db.user_decorations.findMany({
    where: { user_id: userId },
    select: { decoration: true }
  });
  return rows.map((r) => r.decoration);
}
