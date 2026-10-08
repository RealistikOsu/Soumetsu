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
  plinko: { count: 150, windowMs: 30_000 },
  loan_take: { count: 3, windowMs: 60_000 },
  loan_repay: { count: 5, windowMs: 60_000 }
};

export async function checkLimit(key: string, userId: number) {
  const limit = LIMITS[key];
  if (!limit) throw new Error(`No casino limit for ${key}`);

  const redisKey = `casino:limit:${key}:${userId}`;
  const hits = await redis.incr(redisKey);
  if (hits === 1) await redis.pexpire(redisKey, limit.windowMs);
  if (hits > limit.count) throw new Failure(429, 'casino.too_fast');
}

export async function withLock<T>(userId: number, fn: () => Promise<T>) {
  const key = `casino:lock:${userId}`;
  if ((await redis.set(key, '1', 'EX', 10, 'NX')) === null) throw new Failure(409, 'casino.busy');
  try {
    return await fn();
  } finally {
    await redis.del(key);
  }
}
