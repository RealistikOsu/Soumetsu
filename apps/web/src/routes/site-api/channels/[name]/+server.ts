import { requireCaller } from '$server/auth';
import { channelName, history, post } from '$server/channels';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request, params, url }) => {
  await requireCaller(request);
  const before = Number(url.searchParams.get('before')) || null;
  return ok(await history(channelName(params.name), before));
});

export const POST = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  return ok(await post(caller, channelName(params.name), body?.content));
});
