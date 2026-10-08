import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { gradeFromRank, gradeOf, type GradeName } from '$lib/grades';
import { modAcronyms } from '$lib/mods';
import type { DayWindow } from './day';

export type Source = 'stable' | 'lazer';

interface MapColumns {
  beatmapset_id: number;
  difficulty_std: number;
  difficulty_taiko: number;
  difficulty_ctb: number;
  difficulty_mania: number;
  bpm: number;
  hit_length: number;
  ar: number;
  od: number;
  max_combo: number;
  diff_name: string;
  song_name: string;
  ranked: number;
  mapper_id: number;
  mode: number;
  latest_update: number;
}

export interface StableRow extends MapColumns {
  id: number;
  variant: number;
  beatmap_id: number;
  beatmap_md5: string;
  score: number;
  max_combo: number;
  full_combo: number;
  mods: number;
  count_300: number;
  count_100: number;
  count_50: number;
  count_misses: number;
  time: string;
  play_mode: number;
  completed: number;
  accuracy: number;
  pp: number;
  playback_rate: number | null;
}

export interface LazerRow extends MapColumns {
  id: number;
  variant: number;
  beatmap_id: number;
  beatmap_md5: string;
  ruleset_id: number;
  ranked_mods: number;
  mods: string;
  statistics: string;
  total_score: number;
  accuracy: number;
  max_combo: number;
  rank: string;
  passed: number;
  pp: number;
  ended_at: Date;
}

export interface DayScore {
  id: number;
  source: Source;
  variant: 0 | 1 | 2;
  mode: 0 | 1 | 2 | 3;
  beatmapId: number;
  setId: number;
  md5: string;
  score: number;
  pp: number;
  accuracy: number;
  combo: number;
  misses: number;
  c300: number;
  c100: number;
  c50: number;
  mods: string[];
  rate: number;
  passed: boolean;
  grade: GradeName;
  isBest: boolean;
  at: Date;
  map: {
    stars: number;
    bpm: number;
    length: number;
    ar: number;
    od: number;
    maxCombo: number;
    diffName: string;
    songName: string;
    artist: string;
    ranked: number;
    mapperId: number;
    mode: number;
    latestUpdate: number;
  };
}

const STARS = ['difficulty_std', 'difficulty_taiko', 'difficulty_ctb', 'difficulty_mania'] as const;

const MAP_COLUMNS = Prisma.sql`b.beatmapset_id, b.difficulty_std, b.difficulty_taiko, b.difficulty_ctb,
  b.difficulty_mania, b.bpm, b.hit_length, b.ar, b.od, b.max_combo AS map_max_combo, b.diff_name, b.song_name,
  b.ranked, b.mapper_id, b.mode, b.latest_update`;

// The lazer tables only exist once their migrations have run.
export const optional = <T>(query: Promise<T[]>) =>
  query.catch((error: unknown) => {
    if (String(error).includes("doesn't exist")) return [] as T[];
    throw error;
  });

function mapOf(row: MapColumns, mode: number): DayScore['map'] {
  const [artist] = row.song_name.split(' - ', 1);
  return {
    stars: Number(row[STARS[mode] ?? 'difficulty_std']),
    bpm: row.bpm,
    length: row.hit_length,
    ar: row.ar,
    od: row.od,
    maxCombo: Number((row as unknown as { map_max_combo?: number }).map_max_combo ?? row.max_combo),
    diffName: row.diff_name,
    songName: row.song_name,
    artist: artist.trim(),
    ranked: row.ranked,
    mapperId: row.mapper_id,
    mode: row.mode,
    latestUpdate: row.latest_update
  };
}

export function normaliseStable(row: StableRow): DayScore {
  const mods = modAcronyms(row.mods).filter((acronym) => acronym !== 'RX' && acronym !== 'AP');
  const accuracy = Number(row.accuracy);
  return {
    id: Number(row.id),
    source: 'stable',
    variant: row.variant as 0 | 1 | 2,
    mode: row.play_mode as 0 | 1 | 2 | 3,
    beatmapId: row.beatmap_id,
    setId: row.beatmapset_id,
    md5: row.beatmap_md5,
    score: Number(row.score),
    pp: Number(row.pp),
    accuracy,
    combo: row.max_combo,
    misses: row.count_misses,
    c300: row.count_300,
    c100: row.count_100,
    c50: row.count_50,
    mods,
    rate: Number(row.playback_rate) || 1,
    passed: row.completed >= 1,
    grade: gradeOf({
      completed: row.completed,
      mods: mods.map((acronym) => ({ acronym, settings: null })),
      play_mode: row.play_mode,
      count_300: row.count_300,
      count_100: row.count_100,
      count_50: row.count_50,
      count_misses: row.count_misses,
      accuracy
    }),
    isBest: row.completed === 3,
    at: new Date(Number(row.time) * 1000),
    map: mapOf(row, row.play_mode)
  };
}

export function normaliseLazer(row: LazerRow): DayScore {
  const modList = JSON.parse(row.mods) as {
    acronym: string;
    settings: { speed_change?: number } | null;
  }[];
  const stats = JSON.parse(row.statistics) as Record<string, number>;
  const mods = modList
    .map((mod) => mod.acronym)
    .filter((acronym) => !['CL', 'RX', 'AP'].includes(acronym));
  const rate =
    modList.find((mod) => mod.settings?.speed_change)?.settings?.speed_change ??
    (mods.includes('DT') || mods.includes('NC')
      ? 1.5
      : mods.includes('HT') || mods.includes('DC')
        ? 0.75
        : 1);
  return {
    id: Number(row.id),
    source: 'lazer',
    variant: row.variant as 0 | 1 | 2,
    mode: row.ruleset_id as 0 | 1 | 2 | 3,
    beatmapId: row.beatmap_id,
    setId: row.beatmapset_id,
    md5: row.beatmap_md5,
    score: Number(row.total_score),
    pp: Number(row.pp),
    accuracy: Number(row.accuracy) * 100,
    combo: row.max_combo,
    misses: stats.miss ?? 0,
    c300: (stats.great ?? 0) + (stats.perfect ?? 0),
    c100: (stats.ok ?? 0) + (stats.good ?? 0),
    c50: stats.meh ?? 0,
    mods,
    rate,
    passed: row.passed === 1,
    grade: row.passed === 1 ? gradeFromRank(row.rank) : 'F',
    isBest: false,
    at: row.ended_at,
    map: mapOf(row, row.ruleset_id)
  };
}

// Lazer has no "best" flag, so the best play on a map today is the highest ranked-mods pp among passed plays.
function markLazerBests(scores: DayScore[]) {
  const best = new Map<string, DayScore>();
  for (const score of scores) {
    if (score.source !== 'lazer' || !score.passed) continue;
    const key = `${score.md5}:${score.variant}:${score.mode}`;
    const current = best.get(key);
    if (!current || score.pp > current.pp) best.set(key, score);
  }
  for (const score of best.values()) score.isBest = true;
}

export async function loadDayScores(userId: number, window: DayWindow): Promise<DayScore[]> {
  const stableOf = (table: string, variant: number) => Prisma.sql`
    SELECT s.id, ${variant} AS variant, b.beatmap_id, s.beatmap_md5, s.score, s.max_combo, s.full_combo, s.mods,
           s.300_count AS count_300, s.100_count AS count_100, s.50_count AS count_50, s.misses_count AS count_misses,
           s.time, s.play_mode, s.completed, s.accuracy, s.pp, s.playback_rate, ${MAP_COLUMNS}
    FROM ${Prisma.raw(table)} s
    INNER JOIN beatmaps b ON b.beatmap_md5 = s.beatmap_md5
    WHERE s.userid = ${userId} AND s.time >= ${window.startUnix} AND s.time < ${window.endUnix}`;

  const [vanilla, relax, autopilot, lazer] = await Promise.all([
    db.$queryRaw<StableRow[]>(stableOf('scores', 0)),
    db.$queryRaw<StableRow[]>(stableOf('scores_relax', 1)),
    db.$queryRaw<StableRow[]>(stableOf('scores_ap', 2)),
    optional(db.$queryRaw<LazerRow[]>`
      SELECT l.id, l.variant, l.beatmap_id, l.beatmap_md5, l.ruleset_id, l.ranked_mods, CAST(l.mods AS CHAR) AS mods,
             CAST(l.statistics AS CHAR) AS statistics, l.total_score, l.accuracy, l.max_combo, l.rank, l.passed, l.pp,
             l.ended_at, ${MAP_COLUMNS}
      FROM lazer_scores l
      INNER JOIN beatmaps b ON b.beatmap_md5 = l.beatmap_md5
      WHERE l.user_id = ${userId} AND l.ended_at >= ${window.start} AND l.ended_at < ${window.end}`)
  ]);

  const scores = [
    ...vanilla.map(normaliseStable),
    ...relax.map(normaliseStable),
    ...autopilot.map(normaliseStable),
    ...lazer.map(normaliseLazer)
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  markLazerBests(scores);
  return scores;
}
