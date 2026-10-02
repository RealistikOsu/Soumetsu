import { api } from './client';

export interface Settings {
  username_aka: string;
  favourite_mode: number;
  prefer_relax: number;
  play_style: number;
  show_country: boolean;
  email: string;
  custom_badge: { show: boolean; icon: string; name: string; can_custom_badge: boolean };
  disabled_comments: boolean;
}

export const settings = (signal?: AbortSignal) =>
  api.get<Settings>('/users/me/settings', undefined, signal);

export const saveSettings = (body: {
  username_aka?: string;
  favourite_mode?: number;
  play_style?: number;
  disabled_comments?: boolean;
  custom_badge?: { show?: boolean; icon?: string; name?: string };
}) => api.put('/users/me/settings', body);

export const myUserpage = (signal?: AbortSignal) =>
  api.get<{ content: string }>('/users/me/userpage', undefined, signal);

export const saveUserpage = (content: string) => api.put('/users/me/userpage', { content });

export const myEmail = (signal?: AbortSignal) =>
  api.get<{ email: string }>('/users/me/email', undefined, signal);

export const changePassword = (body: {
  current_password: string;
  new_password?: string;
  new_email?: string;
}) => api.put('/users/me/password', body);

export const uploadAvatar = (file: File) => api.upload<{ path: string }>('/users/me/avatar', file);
export const deleteAvatar = () => api.delete('/users/me/avatar');
export const uploadBanner = (file: File) => api.upload<{ path: string }>('/users/me/banner', file);
export const deleteBanner = () => api.delete('/users/me/banner');

export const changeUsername = (username: string) => api.put('/users/me/username', { username });

export interface DiscordLink {
  discord_id: string | null;
  discord_username?: string | null;
  discord_avatar?: string | null;
}

export const discordLink = (signal?: AbortSignal) =>
  api.get<DiscordLink>('/users/me/discord', undefined, signal);

export const linkDiscord = (code: string, redirectUri: string) =>
  api.post<DiscordLink>('/users/me/discord', { code, redirect_uri: redirectUri });

export const unlinkDiscord = () => api.delete('/users/me/discord');
