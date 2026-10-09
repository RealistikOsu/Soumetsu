import { requireCaller } from '$server/auth';
import { subscribe } from '$server/inbox';
import { handle } from '$server/respond';

// Bun closes connections that stay quiet for 10 seconds, so a comment goes out well within that.
const HEARTBEAT = 5_000;

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const encoder = new TextEncoder();
  let stop = () => {};

  const body = new ReadableStream({
    start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      const unsubscribe = subscribe(caller.id, (peer) => write(`data: ${peer}\n\n`));
      const heartbeat = setInterval(() => write(': ping\n\n'), HEARTBEAT);
      stop = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      request.signal.addEventListener('abort', stop);
      write(': connected\n\n');
    },
    cancel: () => stop()
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
});
