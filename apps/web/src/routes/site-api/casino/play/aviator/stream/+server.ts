import { requireCaller } from '$server/auth';
import { stream } from '$server/casino/aviator';
import { handle } from '$server/respond';

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  return new Response(stream(caller.id, request.signal), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  });
});
