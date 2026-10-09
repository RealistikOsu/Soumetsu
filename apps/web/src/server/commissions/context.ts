import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { clockFrom, type DayWindow } from './day';
import { loadDayScores, optional, type DayScore } from './scores';

export interface DailyRow {
  beatmapId: number;
  placement: number;
  stablePlacement: number;
  finalised: boolean;
  // Every play on the challenge map while it ran, which can reach past the commission day's own end.
  scores: DayScore[];
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
  // One entry per play, in the order given.
  leaderboardRanks: (scores: DayScore[]) => Promise<BoardRank[]>;
}

export interface BoardRank {
  rank: number;
  previousFirst: number | null;
  previousFirstValue: number | null;
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

const sqlTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

// The 24 hours a challenge runs for, shaped like a commission day so the score loader can read it.
function spanOf(date: string, start: Date): DayWindow {
  const end = new Date(start.getTime() + 86_400_000);
  const unix = (at: Date) => String(Math.floor(at.getTime() / 1000));
  return { date, start, end, startUnix: unix(start), endUnix: unix(end) };
}

const STABLE_TABLES = ['scores', 'scores_relax', 'scores_ap'];
const STARS = ['difficulty_std', 'difficulty_taiko', 'difficulty_ctb', 'difficulty_mania'];

// A play whose row is gone (deleted or wiped) can't be placed on its board.
const UNRANKED: BoardRank = { rank: Infinity, previousFirst: null, previousFirstValue: null };

interface RankRow {
  id: number;
  place: number;
  first: number | null;
  first_val: number | null;
}

const boardRank = (row: RankRow): BoardRank => ({
  rank: Number(row.place),
  previousFirst: row.first == null ? null : Number(row.first),
  previousFirstValue: row.first_val == null ? null : Number(row.first_val)
});

// Stable boards rank best plays by pp with restricted players hidden, the way the site's beatmap page does. Each play
// is read back from its own table, so the board is compared against the stored row.
const stableRanks = (id: number, table: string, ids: number[]) =>
  db.$queryRaw<RankRow[]>(
    Prisma.sql`
      SELECT c.id,
             1 + (SELECT COUNT(*) FROM ${Prisma.raw(table)} s
                  INNER JOIN users u ON u.id = s.userid AND u.privileges & 1
                  WHERE s.beatmap_md5 = c.beatmap_md5 AND s.play_mode = c.play_mode AND s.completed = 3
                    AND s.userid <> ${id} AND (s.pp > c.pp OR (s.pp = c.pp AND s.id < c.id))) AS place,
             (SELECT f.userid FROM ${Prisma.raw(table)} f
              INNER JOIN users fu ON fu.id = f.userid AND fu.privileges & 1
              WHERE f.beatmap_md5 = c.beatmap_md5 AND f.play_mode = c.play_mode AND f.completed = 3
                AND f.id <> c.id AND f.userid <> ${id}
              ORDER BY f.pp DESC, f.id ASC LIMIT 1) AS first,
             (SELECT f.pp FROM ${Prisma.raw(table)} f
              INNER JOIN users fu ON fu.id = f.userid AND fu.privileges & 1
              WHERE f.beatmap_md5 = c.beatmap_md5 AND f.play_mode = c.play_mode AND f.completed = 3
                AND f.id <> c.id AND f.userid <> ${id}
              ORDER BY f.pp DESC, f.id ASC LIMIT 1) AS first_val
      FROM ${Prisma.raw(table)} c
      WHERE c.id IN (${Prisma.join(ids)})`
  );

// Lazer boards rank by score (vanilla) or pp (relax/autopilot), one play per player: a player is ahead when any of
// their plays beats this one.
function lazerRanks(id: number, byScore: boolean, ids: number[]) {
  const metric = Prisma.raw(byScore ? 'total_score' : 'pp');
  const board = (alias: string) =>
    Prisma.raw(`
    ${alias}.beatmap_id = c.beatmap_id AND ${alias}.ruleset_id = c.ruleset_id AND ${alias}.variant = c.variant
    AND ${alias}.passed = 1 AND ${alias}.ranked_mods = 1`);
  return optional(db.$queryRaw<RankRow[]>`
    SELECT c.id,
           1 + (SELECT COUNT(DISTINCT o.user_id) FROM lazer_scores o
                INNER JOIN users u ON u.id = o.user_id AND u.privileges & 1
                WHERE ${board('o')} AND o.user_id <> ${id} AND o.${metric} > c.${metric}) AS place,
           (SELECT f.user_id FROM lazer_scores f
            INNER JOIN users fu ON fu.id = f.user_id AND fu.privileges & 1
            WHERE ${board('f')} AND f.id <> c.id AND f.user_id <> ${id}
            ORDER BY f.${metric} DESC, f.id ASC LIMIT 1) AS first,
           (SELECT f.${metric} FROM lazer_scores f
            INNER JOIN users fu ON fu.id = f.user_id AND fu.privileges & 1
            WHERE ${board('f')} AND f.id <> c.id AND f.user_id <> ${id}
            ORDER BY f.${metric} DESC, f.id ASC LIMIT 1) AS first_val
    FROM lazer_scores c
    WHERE c.id IN (${Prisma.join(ids)})`);
}

// The top plays and usual star range only shape what gets rolled, so checks skip those queries.
export async function loadContext(
  id: number,
  window: DayWindow,
  { roll = false }: { roll?: boolean } = {}
): Promise<PlayerContext> {
  const [user, stats, tops] = await Promise.all([
    db.users.findUnique({ where: { id }, select: { coins: true, latest_activity: true } }),
    db.users_stats.findUnique({ where: { id }, select: { favourite_mode: true } }),
    // Top play per mode and variant, over the three stable tables and lazer.
    !roll
      ? []
      : Promise.all([
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
  const usual = !roll
    ? []
    : await db.$queryRaw<{ stars: number }[]>(Prisma.sql`
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
      // A day's challenge is the one that starts inside it, whatever hour it was scheduled for. starts_at is a UTC
      // DATETIME, so it's compared and read as text to keep the connection's time zone out of it.
      const [challenge] = await optional(db.$queryRaw<
        { beatmap_id: number; challenge_date: string; starts_at: string }[]
      >`
        SELECT beatmap_id, DATE_FORMAT(challenge_date, '%Y-%m-%d') AS challenge_date,
               DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i:%s') AS starts_at
        FROM lazer_daily_challenges
        WHERE starts_at >= ${sqlTime(window.start)} AND starts_at < ${sqlTime(window.end)}
        ORDER BY starts_at LIMIT 1`);
      if (!challenge) return null;
      const [row] = await optional(db.$queryRaw<
        { placement: number; stable_placement: number; finalised: number }[]
      >`
        SELECT placement, stable_placement, finalised FROM lazer_daily_challenge_days
        WHERE user_id = ${id} AND challenge_date = ${challenge.challenge_date}`);
      const beatmapId = Number(challenge.beatmap_id);
      const start = new Date(`${challenge.starts_at}Z`);
      const plays = await loadDayScores(id, spanOf(window.date, start));
      return {
        beatmapId,
        placement: Number(row?.placement ?? 0),
        stablePlacement: Number(row?.stable_placement ?? 0),
        finalised: Number(row?.finalised ?? 0) === 1,
        scores: plays.filter((score) => score.beatmapId === beatmapId)
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
        optional(db.$queryRaw<{ n: number }[]>`
          SELECT COUNT(*) AS n FROM shop_purchases
          WHERE user_id = ${id} AND bought_at >= ${window.start} AND bought_at < ${window.end}`)
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
    leaderboardRanks: async (scores) => {
      const groupOf = (score: DayScore) =>
        score.source === 'stable'
          ? `stable:${score.variant}`
          : `lazer:${score.variant === 0 ? 'score' : 'pp'}`;
      const ids: Record<string, number[]> = {};
      for (const score of scores) (ids[groupOf(score)] ??= []).push(score.id);
      const found: Record<string, BoardRank> = {};
      await Promise.all(
        Object.entries(ids).map(async ([group, list]) => {
          const [source, kind] = group.split(':');
          const rows =
            source === 'stable'
              ? await stableRanks(id, STABLE_TABLES[Number(kind)], list)
              : await lazerRanks(id, kind === 'score', list);
          for (const row of rows) found[`${group}:${Number(row.id)}`] = boardRank(row);
        })
      );
      return scores.map((score) => found[`${groupOf(score)}:${score.id}`] ?? UNRANKED);
    }
  };
}

export function fakeContext(overrides: Partial<PlayerContext>): PlayerContext {
  const window = overrides.window ?? clockFrom([]).windowOf('2026-10-08');
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
    leaderboardRanks: async (scores) =>
      scores.map(() => ({ rank: 1, previousFirst: null, previousFirstValue: null })),
    ...overrides
  };
}
