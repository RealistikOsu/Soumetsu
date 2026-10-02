import { requireCaller } from '$server/auth';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

// When the player's supporter ends, for the status box on the support page.
export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const user = await db.users.findUnique({
    where: { id: caller.id },
    select: { donor_expire: true }
  });
  const expires = user?.donor_expire ?? 0;
  return ok({ expires: expires > Date.now() / 1000 ? expires : null });
});
