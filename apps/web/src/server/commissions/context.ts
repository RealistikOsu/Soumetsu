import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { windowOf, type DayWindow } from './day';
import { loadDayScores, optional, type DayScore } from './scores';

export interface DailyRow {
  beatmapId: number;
  placement: number;
  stablePlacement: number;
  finalised: boolean;
}
export interface RankedPlayRow {
  matchId: number;
  won: boolean;
  roundsWon: number;
}
export interface MpGameRow {
  matchId: number;
  game: number;
  won: boolean;
}
export interface CasinoRow {
  game: string;
  bet: number;
  multiplier: number;
  payout: number;
}

export interface PlayerContext {
  id: number;
  window: DayWindow;
  favouriteMode: number;
  topPp: (mode: number, variant: number) => number;
  bestTopPp: () => { mode: number; variant: number; pp: number } | null;
  usualStars: number | null;
  coins: number;
  latestActivity: number;
  scores: () => Promise<DayScore[]>;
  daily: () => Promise<DailyRow | null>;
  rankedPlay: () => Promise<RankedPlayRow[]>;
  multiplayer: () => Promise<MpGameRow[]>;
  casino: () => Promise<CasinoRow[]>;
  casinoPurchases: () => Promise<number>;
  weekGames: () => Promise<string[]>;
  playedBefore: (md5s: string[]) => Promise<Map<string, Date>>;
  topMaps: (n: number) => Promise<string[]>;
  leaderboardRank: (score: DayScore) => Promise<{
    rank: number;
    previousFirst: number | null;
    previousFirstValue: number | null;
  }>;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const cached = <T>(load: () => Promise<T>) => {
  let promise: Promise<T> | undefined;
  return () => (promise ??= load());
};

const STABLE_TABLES = ['scores', 'scores_relax', 'scores_ap'];
const STARS = ['difficulty_std', 'difficulty_taiko', 'difficulty_ctb', 'difficulty_mania'];

export async function loadContext(id: number, window: DayWindow): Promise<PlayerContext> {
  const [user, stats, tops] = await Promise.all([
    db.users.findUnique({ where: { id }, select: { coins: true, latest_activity: true } }),
    db.users_stats.findUnique({ where: { id }, select: { favourite_mode: true } }),
    // Top play per mode and variant, over the three stable tables and lazer.
    Promise.all([
      ...STABLE_TABLES.map((table, variant) =>
        db
          .$queryRaw<{ mode: number; pp: number }[]>(
            Prisma.sql`
          SELECT play_mode AS mode, MAX(pp) AS pp FROM ${Prisma.raw(table)}
          WHERE userid = ${id} AND completed = 3 GROUP BY play_mode`
          )
          .then((rows) => rows.map((row) => ({ ...row, variant })))
      ),
      optional(db.$queryRaw<{ mode: number; variant: number; pp: number }[]>`
        SELECT ruleset_id AS mode, variant, MAX(pp) AS pp FROM lazer_scores
        WHERE user_id = ${id} AND passed = 1 AND ranked_mods = 1 GROUP BY ruleset_id, variant`)
    ]).then((groups) => groups.flat())
  ]);

  const favouriteMode = stats?.favourite_mode ?? 0;
  const topByKey = new Map<string, number>();
  for (const top of tops) {
    const key = `${top.mode}:${top.variant}`;
    topByKey.set(key, Math.max(topByKey.get(key) ?? 0, Number(top.pp)));
  }

  // The usual star range follows the favourite mode's difficulty column, over every stable variant.
  const mode = STARS[favouriteMode] ? favouriteMode : 0;
  const difficulty = Prisma.raw(`b.${STARS[mode]}`);
  const usual = await db.$queryRaw<{ stars: number }[]>(Prisma.sql`
    SELECT stars FROM (
      ${Prisma.join(
        STABLE_TABLES.map(
          (table) => Prisma.sql`
            (SELECT s.id, ${difficulty} AS stars FROM ${Prisma.raw(table)} s
             INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5
             WHERE s.userid = ${id} AND s.play_mode = ${mode} AND s.completed >= 1
             ORDER BY s.id DESC LIMIT 50)`
        ),
        ' UNION ALL '
      )}
    ) recent
    ORDER BY id DESC LIMIT 50`);

  const scores = cached(() => loadDayScores(id, window));

  return {
    id,
    window,
    favouriteMode,
    coins: user?.coins ?? 0,
    latestActivity: user?.latest_activity ?? 0,
    usualStars: median(usual.map((row) => Number(row.stars)).filter((stars) => stars > 0)),
    topPp: (mode, variant) => topByKey.get(`${mode}:${variant}`) ?? 0,
    bestTopPp: () => {
      let best: { mode: number; variant: number; pp: number } | null = null;
      for (const [key, pp] of topByKey) {
        const [mode, variant] = key.split(':').map(Number);
        if (!best || pp > best.pp) best = { mode, variant, pp };
      }
      return best;
    },
    scores,
    daily: cached(async () => {
      // The challenge exists before the player's own row does, which is only written once they set a lazer score
      // or the day finalises, so the map comes from the challenge and the placements are optional.
      const [challenge] = await optional(db.$queryRaw<{ beatmap_id: number }[]>`
        SELECT beatmap_id FROM lazer_daily_challenges WHERE challenge_date = ${window.date}`);
      if (!challenge) return null;
      const [row] = await optional(db.$queryRaw<
        { placement: number; stable_placement: number; finalised: number }[]
      >`
        SELECT placement, stable_placement, finalised FROM lazer_daily_challenge_days
        WHERE user_id = ${id} AND challenge_date = ${window.date}`);
      return {
        beatmapId: Number(challenge.beatmap_id),
        placement: Number(row?.placement ?? 0),
        stablePlacement: Number(row?.stable_placement ?? 0),
        finalised: Number(row?.finalised ?? 0) === 1
      };
    }),
    rankedPlay: cached(async () => {
      const rows = await optional(db.$queryRaw<
        { id: number; winner_user_id: number | null; rounds_won: number }[]
      >`
        SELECT m.id, m.winner_user_id, u.rounds_won
        FROM lazer_ranked_play_match_users u
        INNER JOIN lazer_ranked_play_matches m ON m.id = u.match_id
        WHERE u.user_id = ${id} AND m.ended_at >= ${window.start} AND m.ended_at < ${window.end}`);
      return rows.map((row) => ({
        matchId: Number(row.id),
        won: Number(row.winner_user_id) === id,
        roundsWon: Number(row.rounds_won)
      }));
    }),
    multiplayer: cached(async () => {
      // A game is won by having the top passed score in it.
      const rows = await optional(db.$queryRaw<{ match_id: number; game: number; won: number }[]>`
        SELECT s.match_id, s.game,
               s.passed = 1 AND s.score = (
                 SELECT MAX(o.score) FROM mp_match_scores o WHERE o.match_id = s.match_id AND o.game = s.game AND o.passed = 1
               ) AS won
        FROM mp_match_scores s
        INNER JOIN mp_match_games g ON g.match_id = s.match_id AND g.game = s.game
        WHERE s.user_id = ${id} AND g.ended_at >= ${window.start} AND g.ended_at < ${window.end}`);
      return rows.map((row) => ({
        matchId: Number(row.match_id),
        game: Number(row.game),
        won: Number(row.won) === 1
      }));
    }),
    casino: cached(async () => {
      const rows = await optional(db.$queryRaw<
        { game_type: string; bet_amount: number; multiplier: number; payout: number }[]
      >`
        SELECT game_type, bet_amount, multiplier, payout FROM casino_game_history
        WHERE user_id = ${id} AND played_at >= ${window.start} AND played_at < ${window.end}`);
      return rows.map((row) => ({
        game: row.game_type,
        bet: Number(row.bet_amount),
        multiplier: Number(row.multiplier),
        payout: Number(row.payout)
      }));
    }),
    casinoPurchases: cached(async () => {
      const [[casino], [site]] = await Promise.all([
        optional(db.$queryRaw<{ n: number }[]>`
          SELECT COUNT(*) AS n FROM casino_shop_purchases
          WHERE user_id = ${id} AND purchased_at >= ${window.start} AND purchased_at < ${window.end}`),
        db.$queryRaw<{ n: number }[]>`
          SELECT COUNT(*) AS n FROM shop_purchases
          WHERE user_id = ${id} AND bought_at >= ${window.start} AND bought_at < ${window.end}`
      ]);
      return Number(casino?.n ?? 0) + Number(site?.n ?? 0);
    }),
    weekGames: cached(async () => {
      const weekAgo = new Date(window.start.getTime() - 7 * 86_400_000);
      const rows = await optional(db.$queryRaw<{ game_type: string }[]>`
        SELECT DISTINCT game_type FROM casino_game_history
        WHERE user_id = ${id} AND played_at >= ${weekAgo} AND played_at < ${window.start}`);
      return rows.map((row) => row.game_type);
    }),
    playedBefore: async (md5s) => {
      const last = new Map<string, Date>();
      if (!md5s.length) return last;
      const stable = await Promise.all(
        STABLE_TABLES.map((table) =>
          db.$queryRaw<{ beatmap_md5: string; last: string }[]>(Prisma.sql`
            SELECT beatmap_md5, MAX(time) AS last FROM ${Prisma.raw(table)}
            WHERE userid = ${id} AND time < ${window.startUnix} AND beatmap_md5 IN (${Prisma.join(md5s)})
            GROUP BY beatmap_md5`)
        )
      );
      for (const row of stable.flat()) {
        const at = new Date(Number(row.last) * 1000);
        if (!last.has(row.beatmap_md5) || at > last.get(row.beatmap_md5)!)
          last.set(row.beatmap_md5, at);
      }
      const lazer = await optional(db.$queryRaw<{ beatmap_md5: string; last: Date }[]>`
        SELECT beatmap_md5, MAX(ended_at) AS last FROM lazer_scores
        WHERE user_id = ${id} AND ended_at < ${window.start} AND beatmap_md5 IN (${Prisma.join(md5s)})
        GROUP BY beatmap_md5`);
      for (const row of lazer) {
        if (!last.has(row.beatmap_md5) || row.last > last.get(row.beatmap_md5)!)
          last.set(row.beatmap_md5, row.last);
      }
      return last;
    },
    topMaps: async (n) => {
      const [stable, lazer] = await Promise.all([
        db.$queryRaw<{ beatmap_md5: string; pp: number }[]>`
          SELECT beatmap_md5, MAX(pp) AS pp FROM scores
          WHERE userid = ${id} AND play_mode = ${favouriteMode} AND completed = 3
          GROUP BY beatmap_md5 ORDER BY pp DESC LIMIT ${n}`,
        optional(db.$queryRaw<{ beatmap_md5: string; pp: number }[]>`
          SELECT beatmap_md5, MAX(pp) AS pp FROM lazer_scores
          WHERE user_id = ${id} AND ruleset_id = ${favouriteMode} AND variant = 0 AND passed = 1 AND ranked_mods = 1
          GROUP BY beatmap_md5 ORDER BY pp DESC LIMIT ${n}`)
      ]);
      const best: Record<string, number> = {};
      for (const row of [...stable, ...lazer])
        best[row.beatmap_md5] = Math.max(best[row.beatmap_md5] ?? 0, Number(row.pp));
      return Object.entries(best)
        .sort((x, y) => y[1] - x[1])
        .slice(0, n)
        .map(([md5]) => md5);
    },
    leaderboardRank: async (score) => {
      // Stable boards rank best plays by pp with restricted players hidden, the way the site's beatmap page does;
      // lazer boards rank by score (vanilla) or pp (relax/autopilot), one play per player.
      if (score.source === 'stable') {
        const table = STABLE_TABLES[score.variant];
        const [row] = await db.$queryRaw<
          { place: number; first: number | null; first_val: number | null }[]
        >(Prisma.sql`
          SELECT 1 + COUNT(*) AS place,
                 (SELECT userid FROM ${Prisma.raw(table)} f
                  INNER JOIN users fu ON fu.id = f.userid AND fu.privileges & 1
                  WHERE f.beatmap_md5 = ${score.md5} AND f.play_mode = ${score.mode} AND f.completed = 3 AND f.id <> ${score.id} AND f.userid <> ${id}
                  ORDER BY f.pp DESC, f.id ASC LIMIT 1) AS first,
                 (SELECT f.pp FROM ${Prisma.raw(table)} f
                  INNER JOIN users fu ON fu.id = f.userid AND fu.privileges & 1
                  WHERE f.beatmap_md5 = ${score.md5} AND f.play_mode = ${score.mode} AND f.completed = 3 AND f.id <> ${score.id} AND f.userid <> ${id}
                  ORDER BY f.pp DESC, f.id ASC LIMIT 1) AS first_val
          FROM ${Prisma.raw(table)} s
          INNER JOIN users u ON u.id = s.userid AND u.privileges & 1
          WHERE s.beatmap_md5 = ${score.md5} AND s.play_mode = ${score.mode} AND s.completed = 3
            AND s.userid <> ${id} AND (s.pp > ${score.pp} OR (s.pp = ${score.pp} AND s.id < ${score.id}))`);
        return {
          rank: Number(row?.place ?? 1),
          previousFirst: row?.first == null ? null : Number(row.first),
          previousFirstValue: row?.first_val == null ? null : Number(row.first_val)
        };
      }
      const byScore = score.variant === 0;
      const [row] = await optional(db.$queryRaw<
        { place: number; first: number | null; first_val: number | null }[]
      >`
        SELECT 1 + COUNT(*) AS place,
               (SELECT user_id FROM lazer_scores f
                INNER JOIN users fu ON fu.id = f.user_id AND fu.privileges & 1
                WHERE f.beatmap_id = ${score.beatmapId} AND f.ruleset_id = ${score.mode} AND f.variant = ${score.variant}
                  AND f.passed = 1 AND f.ranked_mods = 1 AND f.id <> ${score.id} AND f.user_id <> ${id}
                ORDER BY ${byScore ? Prisma.sql`f.total_score DESC` : Prisma.sql`f.pp DESC`}, f.id ASC LIMIT 1) AS first,
               (SELECT ${byScore ? Prisma.sql`f.total_score` : Prisma.sql`f.pp`} FROM lazer_scores f
                INNER JOIN users fu ON fu.id = f.user_id AND fu.privileges & 1
                WHERE f.beatmap_id = ${score.beatmapId} AND f.ruleset_id = ${score.mode} AND f.variant = ${score.variant}
                  AND f.passed = 1 AND f.ranked_mods = 1 AND f.id <> ${score.id} AND f.user_id <> ${id}
                ORDER BY ${byScore ? Prisma.sql`f.total_score DESC` : Prisma.sql`f.pp DESC`}, f.id ASC LIMIT 1) AS first_val
        FROM (
          SELECT user_id, MAX(${byScore ? Prisma.sql`total_score` : Prisma.sql`pp`}) AS best
          FROM lazer_scores
          WHERE beatmap_id = ${score.beatmapId} AND ruleset_id = ${score.mode} AND variant = ${score.variant}
            AND passed = 1 AND ranked_mods = 1 AND user_id <> ${id}
          GROUP BY user_id
        ) o
        INNER JOIN users u ON u.id = o.user_id AND u.privileges & 1
        WHERE o.best > ${byScore ? score.score : score.pp}`);
      return {
        rank: Number(row?.place ?? 1),
        previousFirst: row?.first == null ? null : Number(row.first),
        previousFirstValue: row?.first_val == null ? null : Number(row.first_val)
      };
    }
  };
}

export function fakeContext(overrides: Partial<PlayerContext>): PlayerContext {
  const window = overrides.window ?? windowOf('2026-10-08');
  return {
    id: 1,
    window,
    favouriteMode: 0,
    coins: 100,
    latestActivity: 0,
    usualStars: null,
    topPp: () => 0,
    bestTopPp: () => null,
    scores: async () => [],
    daily: async () => null,
    rankedPlay: async () => [],
    multiplayer: async () => [],
    casino: async () => [],
    casinoPurchases: async () => 0,
    weekGames: async () => [],
    playedBefore: async () => new Map(),
    topMaps: async () => [],
    leaderboardRank: async () => ({ rank: 1, previousFirst: null, previousFirstValue: null }),
    ...overrides
  };
}
