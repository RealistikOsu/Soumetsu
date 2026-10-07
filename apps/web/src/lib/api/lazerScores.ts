import type { Mod } from '$lib/mods';
import { api } from './client';

export interface LazerScore {
  id: number;
  source: 'lazer' | 'stable';
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
  maximum_statistics?: Record<string, number>;
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

// Lazer ids and stable ids overlap, so a stable score says which table it is in.
export const scoreUrl = (id: number, rx: number) =>
  rx >= 3 ? `/scores/${id}` : `/scores/${id}?rx=${rx}`;

export const scoreDetail = (id: number, stableRx: number | null, signal?: AbortSignal) =>
  stableRx === null
    ? api.get<LazerScore>(`/lazer/scores/${id}`, undefined, signal)
    : api.get<LazerScore>(`/scores/${id}/detail`, { custom_mode: stableRx }, signal);
