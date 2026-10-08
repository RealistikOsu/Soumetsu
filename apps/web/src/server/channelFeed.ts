import type { Redis } from 'ioredis';
import { fromPayload, PUBLIC_CHANNEL, type ChannelMessage } from './channels';
import { redis } from './redis';
import { Failure } from './respond';

const MAX_STREAMS = 5;

interface Listener {
  channel: string;
  notify: (message: ChannelMessage) => void;
}

let listeners: Listener[] = [];
let subscriber: Redis | null = null;
const open: Record<number, number> = {};

// One subscription for the whole process, including the site's own posts so other viewers see them.
function listen() {
  subscriber = redis.duplicate();
  subscriber.on('error', (error) => console.error('channel feed subscriber', error));
  subscriber.on('message', (_, raw) => {
    const parsed = fromPayload(raw);
    if (!parsed) return;
    for (const listener of listeners) {
      if (listener.channel === parsed.channel) listener.notify(parsed.message);
    }
  });
  subscriber.subscribe(PUBLIC_CHANNEL);
}

// Each open tab holds a stream per channel, so a handful per player is plenty.
export function follow(user: number, channel: string, notify: (message: ChannelMessage) => void) {
  if ((open[user] ?? 0) >= MAX_STREAMS) throw new Failure(429, 'site.too_many_streams');
  if (!subscriber) listen();
  open[user] = (open[user] ?? 0) + 1;
  const listener = { channel, notify };
  listeners.push(listener);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    listeners = listeners.filter((other) => other !== listener);
    if (--open[user] <= 0) delete open[user];
  };
}
