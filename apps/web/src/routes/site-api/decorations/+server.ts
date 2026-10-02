import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter(Number.isInteger).slice(0, 100) : null;
  if (!ids) throw new Failure(400, 'site.invalid_request');

  const rows = await db.users.findMany({
    where: { id: { in: ids }, name_decoration: { not: null } },
    select: { id: true, name_decoration: true }
  });
  return ok(
    Object.fromEntries(rows.filter((r) => r.name_decoration).map((r) => [r.id, r.name_decoration]))
  );
});
