import type { Mod } from '$lib/mods';
import { api } from './client';

export interface LazerScore {
  id: number;
  variant: number;
  play_mode: number;
  score: number;
  accuracy: number;
  max_combo: number;
  pp: number;
  rank: string;
  passed: boolean;
  submitted_at: number;
  has_replay: boolean;
  ranked_mods: number;
  mods: Mod[];
  statistics: Record<string, number>;
  maximum_statistics: Record<string, number>;
  global_rank: number | null;
  beatmap: {
    beatmap_id: number;
    beatmapset_id: number;
    title: string;
    artist: string;
    version: string;
    creator: string;
    stars: number;
    mode: number;
    ranked: number;
  };
  player: {
    id: number;
    username: string;
    country: string;
    last_active: number;
    is_online: boolean;
  };
}

export const lazerScore = (id: number, signal?: AbortSignal) =>
  api.get<LazerScore>(`/lazer/scores/${id}`, undefined, signal);
