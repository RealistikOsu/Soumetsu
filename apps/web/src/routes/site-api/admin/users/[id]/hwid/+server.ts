import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, idOf, pageOf } from '$server/admin/common';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

// md5 of "0" and of an empty string are sent when the client can't read a part, and the
// wine/proton mac is shared by everyone on it, so none of them say anything about identity.
const EMPTY = new Set([
  'cfcd208495d565ef66e7dff9f98764da',
  'd41d8cd98f00b204e9800998ecf8427e',
  'b4ec3c4334a0249dae95c284ec5983df'
]);

const parts = ['mac', 'unique_id', 'disk_id'] as const;
const usable = (hash: string) => !!hash && !EMPTY.has(hash);

export const GET = handle(async ({ request, params, url }) => {
  await requirePrivilege(request, Privilege.AdminManageUsers);
  const id = idOf(params);
  const page = pageOf(url);

  const [total, logs] = await Promise.all([
    db.hw_user.count({ where: { userid: id } }),
    db.hw_user.findMany({
      where: { userid: id },
      orderBy: { id: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE
    })
  ]);

  const hashes = (part: (typeof parts)[number]) => [
    ...new Set(logs.map((log) => log[part]).filter(usable))
  ];
  const others =
    logs.length === 0
      ? []
      : await db.hw_user.findMany({
          where: {
            userid: { not: id },
            OR: parts.map((part) => ({ [part]: { in: hashes(part) } }))
          },
          take: 5000
        });
  const names = await db.users.findMany({
    where: { id: { in: [...new Set(others.map((o) => o.userid))] } },
    select: { id: true, username: true }
  });
  const nameOf = new Map(names.map((n) => [n.id, n.username]));

  const rows = logs.map((log) => {
    const matches = others
      .map((other) => {
        const hits = parts.map((part) => usable(log[part]) && log[part] === other[part]);
        return { other, hits };
      })
      .filter(({ hits }) => hits.some(Boolean))
      .map(({ other, hits }) => ({
        userId: other.userid,
        username: nameOf.get(other.userid) ?? String(other.userid),
        logId: other.id,
        mac: other.mac,
        uniqueId: other.unique_id,
        diskId: other.disk_id,
        hits,
        exact: hits.every(Boolean)
      }));
    return {
      id: log.id,
      seen: log.occurencies,
      mac: log.mac,
      uniqueId: log.unique_id,
      diskId: log.disk_id,
      empty: parts.map((part) => !usable(log[part])),
      matches
    };
  });

  return ok({ total, pages: Math.ceil(total / PAGE_SIZE), rows });
});
