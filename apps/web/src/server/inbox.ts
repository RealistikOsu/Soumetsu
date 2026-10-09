import type { Redis } from 'ioredis';
import { redis } from './redis';

export const CHANNEL = 'soumetsu:message';
// What Bancho and the lazer server publish for DMs sent in game; the site's own sends are already on CHANNEL.
const GAME_CHANNEL = 'rosu:chat_message';

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
  subscriber.on('message', (channel, payload) => {
    const { target_id, sender_id, source } = JSON.parse(payload);
    if (channel === GAME_CHANNEL && source === 'web') return;
    for (const listener of listeners) {
      if (listener.user === target_id) listener.notify(sender_id);
      // Someone who sent this from the game sees it appear in their open thread on the site too.
      else if (channel === GAME_CHANNEL && listener.user === sender_id) listener.notify(target_id);
    }
  });
  subscriber.subscribe(CHANNEL, GAME_CHANNEL);
}

export function subscribe(user: number, notify: (peer: number) => void) {
  if (!subscriber) listen();
  const listener = { user, notify };
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((other) => other !== listener);
  };
}
