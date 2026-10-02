import type { Mod } from '$lib/mods';
import { api } from './client';

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
