import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { PAGE_SIZE, pageOf } from '$server/admin/common';
import { db } from '$server/db';
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

  return ok({ pages: Math.ceil(total / PAGE_SIZE), total, clans });
});
