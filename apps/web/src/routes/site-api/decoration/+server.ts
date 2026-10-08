import { decorations } from '$lib/decorations';
import { requireCaller } from '$server/auth';
import { db } from '$server/db';
import { ownedKeys, pickable } from '$server/shop/catalogue';
import { Failure, handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const user = await db.users.findUnique({
    where: { id: caller.id },
    select: { name_decoration: true }
  });
  const owned = await ownedKeys(caller.id);
  return ok({
    current: user?.name_decoration || null,
    unlocked: decorations
      .filter((d) => pickable(d.key, { privileges: caller.privileges, owned }))
      .map((d) => d.key)
  });
});

export const PUT = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as { key?: string } | null;
  const key = body?.key ?? '';

  // An empty key clears it; anything else must be in the catalogue and unlocked for this player.
  if (key) {
    const owned = await ownedKeys(caller.id);
    if (!pickable(key, { privileges: caller.privileges, owned })) {
      throw new Failure(403, 'site.forbidden');
    }
  }
  await db.users.update({ where: { id: caller.id }, data: { name_decoration: key } });
  return ok();
});
