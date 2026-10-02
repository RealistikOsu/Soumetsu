import type { Mod } from '$lib/mods';
import { api } from './client';
import { siteApi } from './site';

export interface Score {
  id: number;
  beatmap_md5: string;
  player_id: number;
  score: number;
  max_combo: number;
  full_combo: boolean;
  mods: Mod[];
  count_300: number;
  count_100: number;
  count_50: number;
  count_katus: number;
  count_gekis: number;
  count_misses: number;
  submitted_at: number;
  play_mode: number;
  completed: number;
  accuracy: number;
  pp: number;
  playtime: number;
}

export interface ScoreBeatmap {
  beatmap_id: number;
  beatmapset_id: number;
  song_name: string;
  difficulty: number;
  ranked: number;
}

export interface ScoreWithBeatmap extends Score {
  beatmap: ScoreBeatmap;
}

export interface TopScore extends ScoreWithBeatmap {
  username: string;
  custom_mode: number;
}

export const topScoresMixed = (signal?: AbortSignal) =>
  api.get<TopScore[]>('/scores/top/mixed', undefined, signal);

export type ScoreKind = 'best' | 'recent' | 'firsts' | 'pinned';

export const playerScores = (
  kind: ScoreKind,
  id: number,
  mode: number,
  rx: number,
  page: number,
  limit: number,
  signal?: AbortSignal
) =>
  api.get<ScoreWithBeatmap[]>(
    `/users/${id}/scores/${kind}`,
    { mode, custom_mode: rx, page, limit },
    signal
  );

export interface WatchedScore extends ScoreWithBeatmap {
  watched_count: number;
}

export const watchedScores = (
  id: number,
  mode: number,
  rx: number,
  page: number,
  limit: number,
  signal?: AbortSignal
) =>
  siteApi.get<WatchedScore[]>(
    `/users/${id}/scores/watched`,
    { mode, custom_mode: rx, page, limit },
    signal
  );

export const pinScore = (id: number, rx: number) =>
  api.post(`/scores/${id}/pin`, undefined, { custom_mode: rx });

export const unpinScore = (id: number) => api.delete(`/scores/${id}/pin`);
