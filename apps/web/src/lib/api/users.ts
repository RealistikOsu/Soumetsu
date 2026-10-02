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
