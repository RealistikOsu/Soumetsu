import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure, handle, ok } from '$server/respond';

const OWNER = 8;

// Every member's clan tag is cached by the game servers, so they are told to look it up again.
const refreshTags = (userIds: number[]) =>
  Promise.all(userIds.map((id) => redis.publish('rosu:clan_update', String(id))));

export const GET = handle(async ({ request, params }) => {
  await requirePrivilege(request, Privilege.PanelManageClans);
  const id = Number(params.id);

  const clan = await db.clans.findUnique({ where: { id } });
  if (!clan) throw new Failure(404, 'Clan not found.');

  const links = await db.user_clans.findMany({ where: { clan: id } });
  const users = await db.users.findMany({
    where: { id: { in: links.map((l) => l.user) } },
    select: { id: true, username: true, country: true, register_datetime: true }
  });
  const members = users
    .map((user) => ({
      id: user.id,
      username: user.username,
      country: user.country,
      registered: user.register_datetime,
      owner: links.some((l) => l.user === user.id && l.perms === OWNER)
    }))
    .sort((a, b) => Number(b.owner) - Number(a.owner) || a.username.localeCompare(b.username));

  return ok({
    id: clan.id,
    name: clan.name,
    tag: clan.tag,
    description: clan.description,
    limit: clan.mlimit,
    members
  });
});

interface Body {
  name: string;
  tag: string;
  description: string;
  limit: number;
}

export const PUT = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.PanelManageClans);
  const id = Number(params.id);
  const body = await bodyOf<Body>(request);

  const name = (body.name ?? '').trim();
  const tag = (body.tag ?? '').trim();
  const limit = Math.floor(Number(body.limit));
  if (!name || !tag || tag.length > 6 || !(limit >= 1)) {
    throw new Failure(400, 'auth.validation_error');
  }

  const { count } = await db.clans.updateMany({
    where: { id },
    data: { name, tag, mlimit: limit, description: (body.description ?? '').trim() }
  });
  if (!count) throw new Failure(404, 'Clan not found.');

  const members = await db.user_clans.findMany({ where: { clan: id }, select: { user: true } });
  await refreshTags(members.map((m) => m.user));
  await rapLog(caller.id, `edited the clan ${name} (${id})`);
  return ok();
});

export const DELETE = handle(async ({ request, params }) => {
  const caller = await requirePrivilege(request, Privilege.PanelManageClans);
  const id = Number(params.id);

  const clan = await db.clans.findUnique({ where: { id }, select: { name: true } });
  if (!clan) throw new Failure(404, 'Clan not found.');

  const members = await db.user_clans.findMany({ where: { clan: id }, select: { user: true } });
  await db.clans.delete({ where: { id } });
  await db.user_clans.deleteMany({ where: { clan: id } });
  await refreshTags(members.map((m) => m.user));
  await rapLog(caller.id, `deleted the clan ${clan.name} (${id})`);
  return ok();
});
