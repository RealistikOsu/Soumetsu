import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import { GAMES } from './games/types';

interface Limit {
  count: number;
  windowMs: number;
}

const standard: Limit = { count: 30, windowMs: 45_000 };

export const LIMITS: Record<string, Limit> = {
  ...Object.fromEntries(GAMES.map((game) => [game, standard])),
  plinko: { count: 150, windowMs: 30_000 }
};

export async function checkLimit(key: string, userId: number) {
  const limit = LIMITS[key];
  if (!limit) throw new Error(`No casino limit for ${key}`);

  const redisKey = `casino:limit:${key}:${userId}`;
  // Creating the key with its expiry first keeps INCR from leaving an immortal counter.
  await redis.set(redisKey, 0, 'PX', limit.windowMs, 'NX');
  const hits = await redis.incr(redisKey);
  if (hits > limit.count) throw new Failure(429, 'casino.too_fast');
}

const RELEASE =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export async function withLock<T>(userId: number, fn: () => Promise<T>) {
  const key = `casino:lock:${userId}`;
  const token = crypto.randomUUID();
  if ((await redis.set(key, token, 'EX', 10, 'NX')) !== 'OK') throw new Failure(409, 'casino.busy');
  try {
    return await fn();
  } finally {
    // The lock may have expired and been taken by someone else while fn ran.
    await redis.eval(RELEASE, 1, key, token);
  }
}
