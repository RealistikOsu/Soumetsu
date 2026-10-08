import { requireCaller } from '$server/auth';
import { blockFor, channelsFor } from '$server/channels';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const [channels, blocked] = await Promise.all([channelsFor(), blockFor(caller)]);
  return ok({ channels, blocked });
});
