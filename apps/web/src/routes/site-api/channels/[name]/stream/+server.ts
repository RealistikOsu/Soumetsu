import { requireCaller } from '$server/auth';
import { follow } from '$server/channelFeed';
import { channelName, readable } from '$server/channels';
import { handle } from '$server/respond';

// Bun closes connections that stay quiet for 10 seconds, so a comment goes out well within that.
const HEARTBEAT = 5_000;

export const GET = handle(async ({ request, params }) => {
  const caller = await requireCaller(request);
  const name = channelName(params.name);
  await readable(name);
  const encoder = new TextEncoder();
  let stop = () => {};
  let write = (text: string) => void text;

  // Taken before the stream starts so going over the limit is still a JSON error.
  const unfollow = follow(caller.id, name, (message) =>
    write(`data: ${JSON.stringify(message)}\n\n`)
  );

  const body = new ReadableStream({
    start(controller) {
      write = (text) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      const heartbeat = setInterval(() => write(': ping\n\n'), HEARTBEAT);
      stop = () => {
        clearInterval(heartbeat);
        unfollow();
      };
      request.signal.addEventListener('abort', stop);
      write(': connected\n\n');
    },
    cancel: () => stop()
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  });
});
