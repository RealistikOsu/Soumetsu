import { requireCaller } from '$server/auth';
import { stand } from '$server/casino/blackjack';
import { handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return ok(await stand(caller.id));
});
