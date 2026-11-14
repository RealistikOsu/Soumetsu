import { createSocket } from 'node:dgram';
import { lookup } from 'node:dns/promises';
import { config } from './config';

const socket = createSocket('udp4');
socket.unref();
socket.on('error', () => {});

// The agent container usually starts after this one and can change address, so look it up again every minute.
let address: string | undefined;
let resolvedAt = 0;

function resolveAgent() {
  resolvedAt = Date.now();
  lookup(config.statsd.host, { family: 4 }).then(
    (found) => (address = found.address),
    () => {}
  );
}

export function timing(name: string, milliseconds: number, tags: string) {
  if (!config.statsd.host) return;
  if (Date.now() - resolvedAt >= 60_000) resolveAgent();
  if (!address) return;
  socket.send(`${name}:${milliseconds}|ms|#${tags}`, config.statsd.port, address);
}
