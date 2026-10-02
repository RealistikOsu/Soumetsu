import { Privilege } from '$lib/auth/privileges';
import { requireCaller, requirePrivilege } from '$server/auth';
import { PAGE_SIZE, bodyOf, pageOf } from '$server/admin/common';
import { entries, record } from '$server/admin/console';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, url }) => {
  await requirePrivilege(request, Privilege.PanelErrorLogs);
  const { total, rows } = await entries(pageOf(url), PAGE_SIZE);

  const ids = [...new Set(rows.map((row) => row.userId).filter((id): id is number => id !== null))];
  const users = await db.users.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true }
  });
  const names = new Map(users.map((u) => [u.id, u.username]));

  return ok({
    pages: Math.ceil(total / PAGE_SIZE),
    rows: rows.map((row) => ({
      ...row,
      username: row.userId === null ? null : (names.get(row.userId) ?? String(row.userId))
    }))
  });
});

// Errors the browser hit, reported by whoever was logged in at the time.
export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = await bodyOf<{ error: string }>(request);
  await record('error', caller.id, String(body.error ?? ''));
  return ok();
});
