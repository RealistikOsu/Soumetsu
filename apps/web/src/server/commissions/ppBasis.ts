import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { optional, type Source } from './scores';

// Ranked and approved; loved and unranked maps give no real pp.
export const RANKED_STATUSES = [2, 3];
export const isRankedStatus = (status: number) => RANKED_STATUSES.includes(status);

const RECENT_DAYS = 14;
// pp tasks need enough of a profile for its 25th best to mean something.
export const MIN_BESTS = 25;

export interface Bucket {
  source: Source;
  mode: number;
  variant: number;
}

export interface PpBasis extends Bucket {
  // The bucket's best plays on ranked maps, highest first, at most MIN_BESTS of them.
  top: number[];
}

export interface BucketCount extends Bucket {
  n: number;
}

const same = (a: Bucket, b: Bucket) =>
  a.source === b.source && a.mode === b.mode && a.variant === b.variant;

// The bucket played most in the last two weeks, or the one with the most best plays when nothing's recent.
export function pickBucket(recent: BucketCount[], bests: BucketCount[]): BucketCount | null {
  const most = (list: BucketCount[]) =>
    list
      .filter((b) => b.n > 0)
      .reduce<BucketCount | null>((x, b) => (!x || b.n > x.n ? b : x), null);
  const chosen = most(recent) ?? most(bests);
  if (!chosen) return null;
  const n = bests.find((b) => same(b, chosen))?.n ?? 0;
  return n >= MIN_BESTS ? { ...chosen, n } : null;
}

// The pp of the nth best play, rounded down to 5 and never under 10.
export function targetPp(basis: PpBasis, n: number, times = 1) {
  const pp = basis.top[n - 1];
  if (pp === undefined) return null;
  return Math.max(10, Math.floor((pp * times) / 5) * 5);
}

const STABLE_TABLES = ['scores', 'scores_relax', 'scores_ap'];
const ranked = Prisma.sql`b.ranked IN (${Prisma.join(RANKED_STATUSES)})`;

async function counts(id: number, since: Date | null): Promise<BucketCount[]> {
  const stable = STABLE_TABLES.map((table, variant) =>
    db
      .$queryRaw<{ mode: number; n: bigint }[]>(
        Prisma.sql`
          SELECT s.play_mode AS mode, COUNT(*) AS n FROM ${Prisma.raw(table)} s
          INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5
          WHERE s.userid = ${id} AND ${ranked}
            AND ${
              since
                ? Prisma.sql`s.time >= ${String(Math.floor(since.getTime() / 1000))} AND s.completed >= 1`
                : Prisma.sql`s.completed = 3`
            }
          GROUP BY s.play_mode`
      )
      .then((rows) =>
        rows.map((row) => ({
          source: 'stable' as const,
          mode: Number(row.mode),
          variant,
          n: Number(row.n)
        }))
      )
  );
  const lazer = optional(
    db.$queryRaw<{ mode: number; variant: number; n: bigint }[]>(Prisma.sql`
      SELECT l.ruleset_id AS mode, l.variant, ${since ? Prisma.sql`COUNT(*)` : Prisma.sql`COUNT(DISTINCT l.beatmap_md5)`} AS n
      FROM lazer_scores l
      INNER JOIN beatmaps b ON b.beatmap_md5 = l.beatmap_md5
      WHERE l.user_id = ${id} AND l.passed = 1 AND l.ranked_mods = 1 AND ${ranked}
        AND ${since ? Prisma.sql`l.ended_at >= ${since}` : Prisma.sql`l.pp > 0`}
      GROUP BY l.ruleset_id, l.variant`)
  ).then((rows) =>
    rows.map((row) => ({
      source: 'lazer' as const,
      mode: Number(row.mode),
      variant: Number(row.variant),
      n: Number(row.n)
    }))
  );
  return (await Promise.all([...stable, lazer])).flat();
}

function topPlays(id: number, bucket: Bucket) {
  if (bucket.source === 'stable')
    return db.$queryRaw<{ pp: number }[]>(Prisma.sql`
      SELECT s.pp FROM ${Prisma.raw(STABLE_TABLES[bucket.variant])} s
      INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5
      WHERE s.userid = ${id} AND s.play_mode = ${bucket.mode} AND s.completed = 3 AND ${ranked}
      ORDER BY s.pp DESC LIMIT ${MIN_BESTS}`);
  // Lazer keeps every play, so only the best one per map counts.
  return optional(
    db.$queryRaw<{ pp: number }[]>(Prisma.sql`
    SELECT MAX(l.pp) AS pp FROM lazer_scores l
    INNER JOIN beatmaps b ON b.beatmap_md5 = l.beatmap_md5
    WHERE l.user_id = ${id} AND l.ruleset_id = ${bucket.mode} AND l.variant = ${bucket.variant}
      AND l.passed = 1 AND l.ranked_mods = 1 AND l.pp > 0 AND ${ranked}
    GROUP BY l.beatmap_md5 ORDER BY pp DESC LIMIT ${MIN_BESTS}`)
  );
}

export async function loadPpBasis(id: number, now = new Date()): Promise<PpBasis | null> {
  const since = new Date(now.getTime() - RECENT_DAYS * 86_400_000);
  const [recent, bests] = await Promise.all([counts(id, since), counts(id, null)]);
  const bucket = pickBucket(recent, bests);
  if (!bucket) return null;
  const rows = await topPlays(id, bucket);
  return {
    source: bucket.source,
    mode: bucket.mode,
    variant: bucket.variant,
    top: rows.map((row) => Number(row.pp))
  };
}
