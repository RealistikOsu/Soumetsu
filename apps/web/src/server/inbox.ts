import type { Redis } from 'ioredis';
import { redis } from './redis';

export const CHANNEL = 'soumetsu:message';

interface Listener {
  user: number;
  notify: (peer: number) => void;
}

let listeners: Listener[] = [];
let subscriber: Redis | null = null;

// A connection in subscriber mode can't run other commands, so it gets its own.
function listen() {
  subscriber = redis.duplicate();
  subscriber.on('error', (error) => console.error('inbox subscriber', error));
  subscriber.on('message', (_, payload) => {
    const { target_id, sender_id } = JSON.parse(payload);
    for (const listener of listeners) {
      if (listener.user === target_id) listener.notify(sender_id);
    }
  });
  subscriber.subscribe(CHANNEL);
}

export function subscribe(user: number, notify: (peer: number) => void) {
  if (!subscriber) listen();
  const listener = { user, notify };
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((other) => other !== listener);
  };
}
