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
  payments: { stripe: boolean; freekassa: boolean; paypal: string | null };
  twitchConfigured: boolean;
  banchoConfigured: boolean;
}

// Where an uploaded banner sits: the point kept in view, in percent, and the zoom in percent.
export interface BannerPosition {
  x: number;
  y: number;
  zoom: number;
}

export type Banner =
  ({ type: 1; value: null } & BannerPosition) | { type: 2; value: string } | null;

export interface UserExtras {
  visibility: 'visible' | 'hidden';
  online: boolean;
  nameDecoration: string | null;
  frozen: boolean;
  silence: { end: number; reason: string } | null;
  commentsDisabled: boolean;
  usernameAka: string;
  favouriteMode: number;
  playStyle: number;
  customBadge: { icon: string; name: string } | null;
  banner: Banner;
  bancho: { id: number; username: string } | null;
  pastNames: string[];
  badges: { name: string; icon: string }[];
  commentCount: number;
  rankedSets: number;
  mappedSets: number;
}

export const siteInfo = (signal?: AbortSignal) => siteApi.get<SiteInfo>('/site', undefined, signal);

export const userExtras = (id: number, signal?: AbortSignal) =>
  siteApi.get<UserExtras>(`/users/${id}/extras`, undefined, signal);
