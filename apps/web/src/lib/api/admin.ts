import type { Mod } from '$lib/mods';
import { siteApi } from './site';

export interface DashboardPlay {
  id: number;
  username: string;
  userid: number;
  country: string;
  time: number;
  score: number;
  pp: number;
  play_mode: number;
  mods: Mod[];
  accuracy: number;
  song_name: string;
  beatmap_id: number;
  custom: number;
  completed: number;
}

export interface Dashboard {
  counters: { registered: number; plays: number; scores: number; totalPp: number };
  pendingRequests: { total: number; oldest: number | null };
  frozen: { total: number; soonest: { username: string; freezedate: number } | null };
  restrictions: { week: number; latest: { username: string; ts: number } | null };
  activity: {
    id: number;
    userid: number;
    username: string | null;
    text: string;
    datetime: number;
  }[];
  latest: DashboardPlay[];
}

export const dashboard = (signal?: AbortSignal) =>
  siteApi.get<Dashboard>('/admin/dashboard', undefined, signal);

export const serviceStatus = (signal?: AbortSignal) =>
  siteApi.get<{ api: boolean; scores: boolean; bancho: boolean }>(
    '/admin/status',
    undefined,
    signal
  );

export interface AdminUserRow {
  id: number;
  username: string;
  country: string;
  registered: number;
  lastSeen: number;
  group: { name: string; colour: string };
}

export const adminUsers = (page: number, user: string, signal?: AbortSignal) =>
  siteApi.get<{ total: number; pages: number; users: AdminUserRow[] }>(
    '/admin/users',
    { page, user },
    signal
  );
