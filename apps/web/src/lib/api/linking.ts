import { siteApi, type BannerPosition } from './site';

export interface BanchoLink {
  configured: boolean;
  link: { id: number; username: string } | null;
}

export const bancho = (signal?: AbortSignal) =>
  siteApi.get<BanchoLink>('/bancho', undefined, signal);
export const startBancho = () => siteApi.post<string>('/bancho/start');
export const finishBancho = (code: string, state: string) =>
  siteApi.post<{ id: number; username: string }>('/bancho/callback', { code, state });
export const unlinkBancho = () => siteApi.delete('/bancho');

export interface TwitchSettings {
  enabled: boolean;
  echo: boolean;
  subOnly: boolean;
  pointsOnly: boolean;
  cooldown: number;
  starFilter: boolean;
  starMin: number;
  starMax: number;
  excluded: string[];
}

export interface TwitchLink {
  configured: boolean;
  link: { username: string } | null;
  settings: TwitchSettings | null;
}

export const twitch = (signal?: AbortSignal) =>
  siteApi.get<TwitchLink>('/twitch', undefined, signal);
export const startTwitch = () => siteApi.post<string>('/twitch/start');
export const finishTwitch = (code: string, state: string) =>
  siteApi.post<{ username: string }>('/twitch/callback', { code, state });
export const unlinkTwitch = () => siteApi.delete('/twitch');
export const saveTwitch = (settings: Omit<TwitchSettings, 'excluded'> & { excluded: string }) =>
  siteApi.put('/twitch', settings);

export const decoration = (signal?: AbortSignal) =>
  siteApi.get<{ current: string | null; unlocked: string[] }>('/decoration', undefined, signal);
export const saveDecoration = (key: string) => siteApi.put('/decoration', { key });

export const saveBanner = (type: 0 | 1 | 2, value?: string, position?: BannerPosition) =>
  siteApi.put('/banner', { type, value, ...position });
