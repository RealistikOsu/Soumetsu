import type { Mod } from '$lib/mods';
import { api, siteApi } from './client';

export interface Beatmap {
  beatmap_id: number;
  beatmapset_id: number;
  beatmap_md5: string;
  song_name: string;
  ar: number;
  od: number;
  mode: number;
  difficulty_std: number;
  difficulty_taiko: number;
  difficulty_ctb: number;
  difficulty_mania: number;
  max_combo: number;
  hit_length: number;
  bpm: number;
  playcount: number;
  passcount: number;
  ranked: number;
  updated_at: number;
  ranked_status_frozen: boolean;
  mapper_id: number;
}

export interface BeatmapScore {
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
  player: { player_id: number; username: string; country: string };
}

export const beatmap = (id: number, signal?: AbortSignal) =>
  api.get<Beatmap>(`/beatmaps/${id}`, undefined, signal);

export const beatmapSet = (setId: number, signal?: AbortSignal) =>
  api.get<Beatmap[]>(`/beatmaps/set/${setId}`, undefined, signal);

export const beatmapScores = (
  id: number,
  mode: number,
  rx: number,
  page = 1,
  limit = 50,
  signal?: AbortSignal
) =>
  api.get<BeatmapScore[]>(`/beatmaps/${id}/scores`, { mode, custom_mode: rx, page, limit }, signal);

export const difficultyOf = (map: Beatmap, mode = map.mode) =>
  [map.difficulty_std, map.difficulty_taiko, map.difficulty_ctb, map.difficulty_mania][mode];

export interface RankRequestStatus {
  submitted: number;
  queue_size: number;
  can_submit: boolean;
  submitted_by_user: number | null;
  max_per_user: number | null;
  next_expiration: string | null;
}

export const rankRequestStatus = (signal?: AbortSignal) =>
  api.get<RankRequestStatus>('/beatmaps/rank-requests/status', undefined, signal);

export const submitRankRequest = (url: string) =>
  api.post<{ request_id: number }>('/beatmaps/rank-requests', { url });

// Only for sets uploaded here, by their mapper or a moderator, while nothing in them is ranked or loved.
export const deleteUploadedSet = (setId: number) => siteApi.delete(`/beatmapsets/${setId}`);
