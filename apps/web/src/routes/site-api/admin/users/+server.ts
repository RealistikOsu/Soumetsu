import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, pageOf } from '$server/admin/common';
import { groupsFor } from '$server/admin/groups';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

// An address searches by email exactly as typed, a number is also tried as a user ID (or, at
// snowflake length, a linked Discord ID), and anything else matches part of a username.
export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.AdminManageUsers);
  const page = pageOf(url);
  const term = url.searchParams.get('user')?.trim() ?? '';
  const isEmail = term.split('@').length === 2 && term.split('@')[1].includes('.');
  const discord = /^\d{17,20}$/.test(term)
    ? await db.$queryRaw<{ user_id: number }[]>`
        SELECT user_id FROM discord_oauth WHERE discord_id = ${term}`
    : [];
  const where = !term
    ? {}
    : isEmail
      ? { email: term }
      : /^\d{1,10}$/.test(term) && Number(term) <= 2147483647
        ? { OR: [{ id: Number(term) }, { username: { contains: term } }] }
        : discord.length
          ? { id: { in: discord.map((row) => row.user_id) } }
          : { username: { contains: term } };

  const [users, total] = await Promise.all([
    db.users.findMany({
      where,
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        username: true,
        privileges: true,
        country: true,
        register_datetime: true,
        latest_activity: true
      }
    }),
    db.users.count({ where })
  ]);

  const groups = await groupsFor(users.map((u) => Number(u.privileges)));
  return ok({
    total,
    pages: Math.ceil(total / PAGE_SIZE),
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      country: u.country,
      registered: u.register_datetime,
      lastSeen: u.latest_activity,
      group: groups[Number(u.privileges)]
    }))
  });
});
