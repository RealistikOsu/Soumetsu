import { Failure } from '$server/respond';
import { db } from '$server/db';
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

const TOTALS_KEY = 'soumetsu:admin:totals';
const TOTALS_TTL = 600;

interface Totals {
  plays: number;
  scores: number;
  totalPp: number;
}

// Nothing in the stack keeps the old panel's ripple:total_* counters up to date, so they are counted
// from the database and cached for a few minutes.
export async function serverTotals(): Promise<Totals> {
  const cached = await redis.get(TOTALS_KEY);
  if (cached) return JSON.parse(cached) as Totals;

  const [stats, scores] = await Promise.all([
    db.$queryRaw<{ plays: bigint | null; pp: bigint | null }[]>`
      SELECT SUM(plays) AS plays, SUM(pp) AS pp FROM (
        SELECT playcount_std + playcount_taiko + playcount_ctb + playcount_mania AS plays,
               pp_std + pp_taiko + pp_ctb + pp_mania AS pp
        FROM users_stats s INNER JOIN users u ON u.id = s.id WHERE u.privileges & 1
        UNION ALL
        SELECT playcount_std + playcount_taiko + playcount_ctb + playcount_mania,
               pp_std + pp_taiko + pp_ctb + pp_mania
        FROM rx_stats s INNER JOIN users u ON u.id = s.id WHERE u.privileges & 1
        UNION ALL
        SELECT playcount_std + playcount_taiko + playcount_ctb + playcount_mania,
               pp_std + pp_taiko + pp_ctb + pp_mania
        FROM ap_stats s INNER JOIN users u ON u.id = s.id WHERE u.privileges & 1
      ) t`,
    db.$queryRaw<{ total: bigint }[]>`
      SELECT (SELECT COUNT(*) FROM scores) + (SELECT COUNT(*) FROM scores_relax)
           + (SELECT COUNT(*) FROM scores_ap) AS total`
  ]);

  const totals = {
    plays: Number(stats[0]?.plays ?? 0),
    scores: Number(scores[0]?.total ?? 0),
    totalPp: Number(stats[0]?.pp ?? 0)
  };
  await redis.set(TOTALS_KEY, JSON.stringify(totals), 'EX', TOTALS_TTL);
  return totals;
}
