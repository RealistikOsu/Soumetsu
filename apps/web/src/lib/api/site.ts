import { siteApi } from './client';

export { siteApi };

export interface SiteInfo {
  globalAlert: string | null;
  websiteMaintenance: boolean;
  gameMaintenance: boolean;
  registrationsEnabled: boolean;
  clanCreationEnabled: boolean;
  latestPlayer: { id: number; username: string } | null;
  mapsRanked: number;
  twitchConfigured: boolean;
  banchoConfigured: boolean;
}

export interface UserExtras {
  visibility: 'visible' | 'hidden';
  nameDecoration: string | null;
  frozen: boolean;
  silence: { end: number; reason: string } | null;
  commentsDisabled: boolean;
  usernameAka: string;
  favouriteMode: number;
  playStyle: number;
  customBadge: { icon: string; name: string } | null;
  banner: { type: number; value: string | null } | null;
  bancho: { id: number; username: string } | null;
  pastNames: string[];
  badges: { name: string; icon: string }[];
  commentCount: number;
}

export const siteInfo = (signal?: AbortSignal) => siteApi.get<SiteInfo>('/site', undefined, signal);

export const userExtras = (id: number, signal?: AbortSignal) =>
  siteApi.get<UserExtras>(`/users/${id}/extras`, undefined, signal);
