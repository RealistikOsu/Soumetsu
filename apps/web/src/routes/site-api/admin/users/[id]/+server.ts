import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { isOnline, kick } from '$server/admin/bancho';
import { bodyOf, idOf } from '$server/admin/common';
import { groupsFor } from '$server/admin/groups';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageUsers);
  const id = idOf(params);
  const canViewIps = !!(caller.privileges & Privilege.PanelViewIps);

  const user = await db.users.findUnique({ where: { id } });
  if (!user) throw new Failure(404, 'users.user_not_found');

  const [stats, badges, allBadges, groupRows, history, ip, whitelisted, hwids, bans, clan, online] =
    await Promise.all([
      db.users_stats.findUnique({
        where: { id },
        select: { userpage_content: true, username_aka: true }
      }),
      db.user_badges.findMany({
        where: { user: id },
        orderBy: { id: 'asc' },
        select: { badge: true }
      }),
      db.badges.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true } }),
      db.privileges_groups.findMany({ orderBy: { id: 'asc' } }),
      db.user_name_history.findMany({
        where: { user_id: id },
        orderBy: { replaced_at: 'desc' },
        select: { username: true },
        distinct: ['username']
      }),
      canViewIps
        ? db.ip_user.findFirst({
            where: { userid: id },
            orderBy: { ip: 'desc' },
            select: { ip: true }
          })
        : null,
      db.whitelist.findUnique({ where: { user_id: id } }),
      db.hw_user.count({ where: { userid: id } }),
      db.$queryRaw<
        { from_id: number; from_name: string; ts: number; summary: string; detail: string }[]
      >`SELECT b.from_id, f.username AS from_name, UNIX_TIMESTAMP(b.ts) AS ts, b.summary, b.detail
        FROM ban_logs b INNER JOIN users f ON f.id = b.from_id WHERE b.to_id = ${id}
        ORDER BY b.id DESC`,
      db.$queryRaw<{ id: number; name: string; tag: string }[]>`
        SELECT c.id, c.name, c.tag FROM user_clans uc INNER JOIN clans c ON c.id = uc.clan
        WHERE uc.user = ${id} LIMIT 1`,
      isOnline(id)
    ]);

  const privileges = Number(user.privileges);
  const groups = await groupsFor([privileges]);
  const slots = Array.from({ length: 6 }, (_, i) => badges[i]?.badge ?? 0);

  return ok({
    user: {
      id,
      username: user.username,
      country: user.country,
      privileges,
      group: groups[privileges],
      email: user.email,
      registered: user.register_datetime,
      lastSeen: user.latest_activity,
      aka: stats?.username_aka ?? '',
      userpage: (stats?.userpage_content ?? '').trim(),
      notes: (user.notes ?? '').trim(),
      bypassHwid: user.bypass_hwid,
      donorExpire: user.donor_expire,
      silenceEnd: user.silence_end,
      silenceReason: user.silence_reason,
      banReason: user.ban_reason.trim(),
      frozen: user.frozen !== 0,
      freezeDate: user.freezedate,
      whitelistModes: whitelisted?.modes ?? 0,
      online,
      ip: ip?.ip ?? null,
      previousNames: history.map((h) => h.username),
      badges: slots,
      clan: clan[0] ?? null
    },
    groups: groupRows.map((g) => ({ privileges: Number(g.privileges), name: g.name })),
    badgeChoices: allBadges,
    banLogs: bans.map((b) => ({ ...b, ts: Number(b.ts) })),
    hwidCount: hwids,
    canViewIps,
    callerPrivileges: caller.privileges
  });
});

interface Edit {
  aka: string;
  email: string;
  country: string;
  privilege: number;
  userpage: string;
  notes: string;
  badges: number[];
}

export const POST = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageUsers);
  const id = idOf(params);
  const body = await bodyOf<Edit>(request);

  const target = await db.users.findUnique({
    where: { id },
    select: { privileges: true, username: true }
  });
  if (!target) throw new Failure(404, 'users.user_not_found');

  const privilege = Number(body.privilege ?? target.privileges);
  if (privilege !== Number(target.privileges)) {
    if (!(caller.privileges & Privilege.AdminManagePrivilege)) {
      throw new Failure(403, 'You do not have permission to manage privileges.');
    }
    if (privilege & ~caller.privileges) {
      throw new Failure(403, 'You cannot grant privileges you do not have.');
    }
  }
  if (id === caller.id && privilege > caller.privileges) {
    throw new Failure(403, 'You cannot ascend yourself.');
  }

  const badges = (body.badges ?? []).map(Number).filter((b) => b > 1);
  await db.user_badges.deleteMany({ where: { user: id } });
  if (badges.length) {
    await db.user_badges.createMany({ data: badges.map((badge) => ({ user: id, badge })) });
  }

  await db.users.update({
    where: { id },
    data: {
      email: body.email ?? '',
      notes: body.notes ?? '',
      privileges: privilege,
      country: body.country ?? 'XX'
    }
  });
  await db.users_stats.update({
    where: { id },
    data: { userpage_content: body.userpage || null, username_aka: body.aka ?? '' }
  });

  await redis.publish('peppy:refresh_privs', JSON.stringify({ user_id: id }));
  await rapLog(caller.id, `has edited the user ${target.username} (${id})`);
  await kick(id, 'Reloading data...');
  return ok();
});
