import { Failure } from '$server/respond';
import { redis } from '$server/redis';

export const PAGE_SIZE = 50;

export const pageOf = (url: URL) => Math.max(1, Number(url.searchParams.get('page')) || 1);

export async function counter(key: string) {
  return Number((await redis.get(key)) ?? 0) || 0;
}

export const MODE_NAMES = ['osu!', 'Taiko', 'Catch', 'Mania'];

export async function bodyOf<T>(request: Request) {
  return ((await request.json().catch(() => null)) ?? {}) as Partial<T>;
}

export const idOf = (params: { id?: string }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) throw new Failure(404, 'users.user_not_found');
  return id;
};
