import { redis } from '$server/redis';

const KEY = 'soumetsu:console';
const KEPT = 500;

export interface Entry {
  level: 'error' | 'warning';
  userId: number | null;
  message: string;
  stack: string;
  time: number;
}

// Errors the site hit, newest first, kept in Redis since the panel's old SQLite store is gone.
export async function record(level: Entry['level'], userId: number | null, error: unknown) {
  const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const entry: Entry = {
    level,
    userId,
    message: stack.split('\n')[0].slice(0, 300),
    stack: stack.slice(0, 4000),
    time: Math.floor(Date.now() / 1000)
  };
  await redis
    .multi()
    .lpush(KEY, JSON.stringify(entry))
    .ltrim(KEY, 0, KEPT - 1)
    .exec()
    .catch(() => null);
}

export async function entries(page: number, size: number) {
  const [total, rows] = await Promise.all([
    redis.llen(KEY),
    redis.lrange(KEY, (page - 1) * size, page * size - 1)
  ]);
  return { total, rows: rows.map((row) => JSON.parse(row) as Entry) };
}
