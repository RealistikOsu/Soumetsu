import { requireCaller } from '$server/auth';
import { stream } from '$server/casino/aviator';
import { handle } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return new Response(stream(caller.id, request.signal), {
    headers: {
      'Content-Type': 'text/event-stream',
      // no-transform stops Cloudflare compressing the stream, which holds events back until a chunk fills.
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
});
