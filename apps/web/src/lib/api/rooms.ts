import type { Mod } from '$lib/mods';
import { api } from './client';
import type { BeatmapRef, UserRef } from './rankedPlay';

export interface ChallengeDay {
  date: string;
  has_challenge: boolean;
}

export interface DailyChallenge {
  date: string;
  beatmap: BeatmapRef;
  ruleset: number;
  required_mods: Mod[];
  participants: number;
  top_10_score: number | null;
  top_50_score: number | null;
  room_id: number | null;
}

export interface RoomScore {
  rank: number;
  user: UserRef;
  total_score: number;
  accuracy: number;
  max_combo: number;
  play_count: number;
  grade: string;
  mods: Mod[];
}

export interface RoomScores {
  total: number;
  scores: RoomScore[];
}

export interface PlaylistSummary {
  id: number;
  name: string;
  host: UserRef | null;
  created_at: string;
  ends_at: string | null;
  ended_at: string | null;
  item_count: number;
  participants: number;
  first_beatmap: BeatmapRef | null;
  star_min: number | null;
  star_max: number | null;
}

export interface PlaylistItem {
  item_id: number;
  ruleset: number;
  beatmap: BeatmapRef;
  required_mods: Mod[];
  allowed_mods: Mod[];
  expired: boolean;
  participants: number;
}

export interface Playlist {
  room: PlaylistSummary;
  items: PlaylistItem[];
}

export type PlaylistStatus = 'active' | 'ended';

export const SCORES_PAGE_SIZE = 50;
export const PLAYLISTS_PAGE_SIZE = 20;

export const challengeDays = async (year: number, month: number, signal?: AbortSignal) =>
  (await api.get<{ days: ChallengeDay[] }>('/daily-challenge/days', { year, month }, signal)).days;

export const dailyChallenge = (date: string, signal?: AbortSignal) =>
  api.get<DailyChallenge>(`/daily-challenge/${date}`, undefined, signal);

export const dailyScores = (date: string, page: number, signal?: AbortSignal) =>
  api.get<RoomScores>(`/daily-challenge/${date}/scores`, { page, limit: SCORES_PAGE_SIZE }, signal);

export const playlists = (status: PlaylistStatus, page: number, signal?: AbortSignal) =>
  api.get<{ total: number; rooms: PlaylistSummary[] }>(
    '/playlists',
    { status, page, limit: PLAYLISTS_PAGE_SIZE },
    signal
  );

export const playlist = (id: number, signal?: AbortSignal) =>
  api.get<Playlist>(`/playlists/${id}`, undefined, signal);

export const playlistScores = (id: number, item: number, page: number, signal?: AbortSignal) =>
  api.get<RoomScores>(
    `/playlists/${id}/items/${item}/scores`,
    { page, limit: SCORES_PAGE_SIZE },
    signal
  );
