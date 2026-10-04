import { requireCaller } from '$server/auth';
import { MAX_LENGTH, send, thread } from '$server/messages';
import { Failure, handle, ok } from '$server/respond';

function peerOf(params: Partial<Record<string, string>>) {
  const peer = Number(params.peer);
  if (!Number.isInteger(peer) || peer <= 0) throw new Failure(400, 'site.invalid_request');
  return peer;
}

export const GET = handle(async ({ request, params, url }) => {
  const caller = await requireCaller(request);
  const before = Number(url.searchParams.get('before')) || null;
  return ok(await thread(caller.id, peerOf(params), before));
});

export const POST = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content || content.length > MAX_LENGTH) throw new Failure(400, 'site.invalid_request');
  return ok(await send(caller.id, peerOf(params), content));
});
