import { randomBytes } from 'node:crypto';
import { redis } from './redis';
import { Failure } from './respond';

const TEN_MINUTES = 600;

export type Provider = 'bancho' | 'twitch';

// A state value ties a callback to the player who started it, and works once.
export async function startState(provider: Provider, userId: number) {
  const state = randomBytes(24).toString('hex');
  await redis.set(`oauth_state:${provider}:${userId}`, state, 'EX', TEN_MINUTES);
  return state;
}

export async function consumeState(provider: Provider, userId: number, given: string | undefined) {
  const key = `oauth_state:${provider}:${userId}`;
  const expected = await redis.getdel(key);
  if (!expected || given !== expected) throw new Failure(400, 'site.oauth_state_invalid');
}

export async function jsonOrFail(response: Response, code: string) {
  if (!response.ok) throw new Failure(502, code);
  return response.json();
}
