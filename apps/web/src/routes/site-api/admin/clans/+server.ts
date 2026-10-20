import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, pageOf } from '$server/admin/common';
import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.PanelManageClans);
  const page = pageOf(url);
  const term = (url.searchParams.get('q') ?? '').trim();
  const where = term ? { OR: [{ name: { contains: term } }, { tag: { contains: term } }] } : {};

  const [clans, total] = await Promise.all([
    db.clans.findMany({
      where,
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: { id: true, name: true, description: true, tag: true }
    }),
    db.clans.count({ where })
  ]);

  const ids = clans.map((c) => c.id);
  const [sizes, owners] = ids.length
    ? await Promise.all([
        db.user_clans.groupBy({ by: ['clan'], where: { clan: { in: ids } }, _count: true }),
        db.$queryRaw<{ clan: number; id: number; username: string }[]>`
          SELECT uc.clan, u.id, u.username FROM user_clans uc INNER JOIN users u ON u.id = uc.user
          WHERE uc.perms = 8 AND uc.clan IN (${Prisma.join(ids)})`
      ])
    : [[], []];

  return ok({
    pages: Math.ceil(total / PAGE_SIZE),
    total,
    clans: clans.map((clan) => {
      const owner = owners.find((o) => o.clan === clan.id);
      return {
        ...clan,
        members: sizes.find((s) => s.clan === clan.id)?._count ?? 0,
        owner: owner ? { id: owner.id, username: owner.username } : null
      };
    })
  });
});
