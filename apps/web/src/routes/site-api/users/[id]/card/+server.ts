import { isOnline } from '$server/admin/bancho';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

// The badge that names someone's role on a card, strongest first. Everyone else with the supporter badge is a Supporter.
const GROUPS: [number, string][] = [
  [2, 'Developer'],
  [1018, 'Administrator'],
  [1020, 'Community Manager'],
  [30, 'Chat Moderator'],
  [5, 'BAT'],
  [1002, 'Supporter']
];

// What the API's card leaves out: whether Bancho has them online, the clan, the role, the name decoration and when they were last on.
export const GET = handle(async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new Failure(404, 'users.user_not_found');

  const [users, clans, badges, online] = await Promise.all([
    db.$queryRaw<{ name_decoration: string | null; latest_activity: number }[]>`
      SELECT name_decoration, latest_activity FROM users WHERE id = ${id} AND privileges & 1`,
    db.$queryRaw<{ id: number; tag: string; name: string }[]>`
      SELECT c.id, c.tag, c.name FROM user_clans uc INNER JOIN clans c ON c.id = uc.clan
      WHERE uc.user = ${id} LIMIT 1`,
    db.$queryRaw<{ badge: number }[]>`SELECT badge FROM user_badges WHERE user = ${id}`,
    isOnline(id)
  ]);
  const user = users[0];
  if (!user) throw new Failure(404, 'users.user_not_found');

  const owned = new Set(badges.map((b) => b.badge));
  return ok({
    decoration: user.name_decoration || null,
    online,
    lastSeen: user.latest_activity,
    clan: clans[0] ?? null,
    group: GROUPS.find(([badge]) => owned.has(badge))?.[1] ?? null
  });
});
