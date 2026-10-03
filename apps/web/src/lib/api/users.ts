import { api } from './client';

export interface ClanInfo {
  id: number;
  name: string;
  tag: string;
}

export interface DiscordInfo {
  id: string;
  username: string;
  avatar: string;
}

export interface UserStats {
  mode: number;
  custom_mode: number;
  global_rank: number;
  country_rank: number;
  pp: number;
  accuracy: number;
  playcount: number;
  total_score: number;
  ranked_score: number;
  total_hits: number;
  playtime: number;
  max_combo: number;
  replays_watched: number;
  level: number;
  first_places: number;
}

export interface UserProfile {
  id: number;
  username: string;
  country: string;
  privileges: number;
  registered_at: number;
  latest_activity: number;
  is_online: boolean;
  clan: ClanInfo | null;
  discord: DiscordInfo | null;
  stats: UserStats;
}

export interface LoginResult {
  token: string;
  user_id: number;
  username: string;
  privileges: number;
}

export const login = (username: string, password: string, captcha?: string) =>
  api.post<LoginResult>('/auth/login', { username, password, captcha });

export const logout = () => api.post('/auth/logout');

export const me = () => api.get<UserProfile>('/users/me');

export const profile = (id: number, mode: number, rx: number, signal?: AbortSignal) =>
  api.get<UserProfile>(`/users/${id}`, { mode, custom_mode: rx }, signal);

export const userpage = (id: number, signal?: AbortSignal) =>
  api.get<{ content: string }>(`/users/${id}/userpage`, undefined, signal);

export interface Achievement {
  id: number;
  name: string;
  description: string;
  file: string;
  achieved: boolean;
  achieved_at: number | null;
}

export const achievements = (id: number, signal?: AbortSignal) =>
  api.get<Achievement[]>(`/users/${id}/achievements`, undefined, signal);

export const followers = (id: number, signal?: AbortSignal) =>
  api.get<{ follower_count: number; friend_count: number }>(
    `/users/${id}/followers`,
    undefined,
    signal
  );

export interface MostPlayed {
  beatmap: { beatmap_id: number; beatmapset_id: number; song_name: string };
  playcount: number;
}

export const mostPlayed = (
  id: number,
  mode: number,
  rx: number,
  page: number,
  limit: number,
  signal?: AbortSignal
) =>
  api.get<MostPlayed[]>(
    `/users/${id}/beatmaps/most-played`,
    { mode, custom_mode: rx, page, limit },
    signal
  );

export interface RankPoint {
  overall: number;
  country: number | null;
  captured_at: string;
}

export interface PpPoint {
  pp: number | null;
  captured_at: string;
}

export const rankHistory = (id: number, mode: number, rx: number, signal?: AbortSignal) =>
  api.get<RankPoint[]>(`/users/${id}/history/rank`, { mode, custom_mode: rx }, signal);

export const ppHistory = (id: number, mode: number, rx: number, signal?: AbortSignal) =>
  api.get<PpPoint[]>(`/users/${id}/history/pp`, { mode, custom_mode: rx }, signal);

export interface Comment {
  id: number;
  author_id: number;
  author_username: string;
  profile_id: number;
  message: string;
  created_at: number;
}

export const comments = (id: number, page: number, signal?: AbortSignal) =>
  api.get<Comment[]>(`/users/${id}/comments`, { page, limit: 10 }, signal);

export const postComment = (profileId: number, message: string) =>
  api.post<Comment>('/comments/', { profile_id: profileId, message });

export const deleteComment = (id: number) => api.delete(`/comments/${id}`);

export const isFriend = (id: number, signal?: AbortSignal) =>
  api.get<{ is_friend: boolean }>(`/users/me/friends/${id}`, undefined, signal);

export const addFriend = (id: number) => api.post(`/users/me/friends/${id}`);

export const removeFriend = (id: number) => api.delete(`/users/me/friends/${id}`);

export interface ProfileSet {
  beatmapset_id: number;
  beatmap_id: number;
  title: string;
  status: number;
  difficulties: number;
  time: number;
}

// Sets a staff member ranked or loved, or sets a player uploaded to the server.
export const profileSets = (
  kind: 'ranked' | 'mapped',
  id: number,
  page: number,
  limit: number,
  signal?: AbortSignal
) => api.get<ProfileSet[]>(`/users/${id}/beatmaps/${kind}`, { page, limit }, signal);
