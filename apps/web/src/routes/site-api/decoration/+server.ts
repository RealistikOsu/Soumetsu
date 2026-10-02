import { decorations, type DecorationTier } from '$lib/decorations';
import { requireCaller } from '$server/auth';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

const DONOR = 4;
const ADMIN_ACCESS_RAP = 8;

// What a player may pick: the default styles for anyone, supporter ones with the supporter privilege,
// and the staff ones for staff.
function allowedTiers(privileges: number): DecorationTier[] {
  const tiers: DecorationTier[] = ['everyone'];
  if (privileges & DONOR) tiers.push('supporter');
  if (privileges & ADMIN_ACCESS_RAP) tiers.push('staff');
  return tiers;
}

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const user = await db.users.findUnique({
    where: { id: caller.id },
    select: { name_decoration: true }
  });
  const tiers = allowedTiers(caller.privileges);
  return ok({
    current: user?.name_decoration || null,
    unlocked: decorations.filter((d) => tiers.includes(d.tier)).map((d) => d.key)
  });
});

export const PUT = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as { key?: string } | null;
  const key = body?.key ?? '';

  // An empty key clears it; anything else must be in the catalogue and unlocked for this player.
  if (key) {
    const tiers = allowedTiers(caller.privileges);
    if (!decorations.some((d) => d.key === key && tiers.includes(d.tier))) {
      throw new Failure(403, 'site.forbidden');
    }
  }
  await db.users.update({ where: { id: caller.id }, data: { name_decoration: key } });
  return ok();
});
