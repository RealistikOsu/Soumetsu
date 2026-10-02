import { redis } from '$server/redis';

export const PAGE_SIZE = 50;

export const pageOf = (url: URL) => Math.max(1, Number(url.searchParams.get('page')) || 1);

export async function counter(key: string) {
  return Number((await redis.get(key)) ?? 0) || 0;
}

export const MODE_NAMES = ['osu!', 'Taiko', 'Catch', 'Mania'];
