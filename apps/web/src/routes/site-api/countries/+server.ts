import { redis } from '$server/redis';
import { handle, ok } from '$server/respond';

// Countries ordered by how many players they have, as the game server keeps them.
export const GET = handle(async ({ url }) => {
  const limit = Math.min(Number(url.searchParams.get('limit')) || 11, 500);
  const countries = await redis.zrevrange('hanayo:country_list', 0, limit - 1);
  return ok(countries.map((country) => country.toUpperCase()));
});
