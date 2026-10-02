import { api } from './client';
import { siteApi } from './site';

export interface Clan {
  id: number;
  name: string;
  description: string;
  tag: string;
  member_limit: number;
  member_count: number;
}

export interface ClanMember {
  user_id: number;
  username: string;
  country: string;
  is_owner: boolean;
}

export interface ClanRanking {
  id: number;
  name: string;
  tag: string;
  chosen_mode: { pp: number; ranked_score: number; total_score: number; playcount: number };
  rank: number;
  member_count: number;
}

export interface ClanStats {
  total_pp: number;
  total_ranked_score: number;
  total_total_score: number;
  rank: number;
}

export interface ClanMemberStats {
  id: number;
  username: string;
  country: string;
  pp: number;
  accuracy: number;
  playcount: number;
  level: number;
}

export const CLANBOARD_PAGE_SIZE = 50;

export const clanLeaderboard = (mode: number, rx: number, page: number, signal?: AbortSignal) =>
  api.get<ClanRanking[]>(
    '/clans/leaderboard',
    { mode, custom_mode: rx, page, limit: CLANBOARD_PAGE_SIZE },
    signal
  );

export const clan = (id: number, signal?: AbortSignal) =>
  api.get<Clan>(`/clans/${id}`, undefined, signal);

export const clanStats = (id: number, mode: number, rx: number, signal?: AbortSignal) =>
  api.get<ClanStats>(`/clans/${id}/stats`, { mode, custom_mode: rx }, signal);

export const clanMembers = (id: number, signal?: AbortSignal) =>
  api.get<ClanMember[]>(`/clans/${id}/members`, { limit: 100 }, signal);

export const clanMemberStats = (id: number, mode: number, rx: number, signal?: AbortSignal) =>
  api.get<ClanMemberStats[]>(`/clans/${id}/members/leaderboard`, { mode, custom_mode: rx }, signal);

export const createClan = (body: { name: string; tag: string; description: string }) =>
  api.post<Clan>('/clans/', body);

export const updateClan = (
  id: number,
  body: { name?: string; tag?: string; description?: string }
) => api.put<Clan>(`/clans/${id}`, body);

export const disbandClan = (id: number) => api.delete(`/clans/${id}`);

export const leaveClan = (id: number) => api.delete(`/clans/${id}/members/me`);

export const kickMember = (id: number, userId: number) =>
  api.delete(`/clans/${id}/members/${userId}`);

export const clanInvite = (id: number, signal?: AbortSignal) =>
  api.get<{ invite: string }>(`/clans/${id}/invite`, undefined, signal);

export const newClanInvite = (id: number) => api.post<{ invite: string }>(`/clans/${id}/invite`);

export const joinClan = (invite: string) => api.post<Clan>('/clans/join', undefined, { invite });

export const uploadClanIcon = (id: number, file: File) =>
  api.upload<{ path: string }>(`/clans/${id}/icon`, file);

export const deleteClanIcon = (id: number) => api.delete(`/clans/${id}/icon`);

export const resolveClan = (name: string) => siteApi.get<number>('/clans/resolve', { name });

// The API's own rules, so the form can say so before sending.
export const clanNamePattern = new RegExp(String.raw`^[A-Za-z0-9 '_\[\]\-]{2,15}$`, 'v');
export const clanTagPattern = /^[A-Za-z0-9]{2,6}$/;
