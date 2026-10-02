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

export interface AdminUserDetail {
  user: {
    id: number;
    username: string;
    country: string;
    privileges: number;
    group: { name: string; colour: string };
    email: string;
    registered: number;
    lastSeen: number;
    aka: string;
    userpage: string;
    notes: string;
    bypassHwid: boolean;
    donorExpire: number;
    silenceEnd: number;
    silenceReason: string;
    banReason: string;
    frozen: boolean;
    freezeDate: number;
    whitelisted: boolean;
    online: boolean;
    ip: string | null;
    previousNames: string[];
    badges: number[];
    clan: { id: number; name: string; tag: string } | null;
  };
  groups: { privileges: number; name: string }[];
  badgeChoices: { id: number; name: string }[];
  banLogs: { from_id: number; from_name: string; ts: number; summary: string; detail: string }[];
  hwidCount: number;
  canViewIps: boolean;
  callerPrivileges: number;
}

export const adminUser = (id: number, signal?: AbortSignal) =>
  siteApi.get<AdminUserDetail>(`/admin/users/${id}`, undefined, signal);

export interface UserEdit {
  aka: string;
  email: string;
  country: string;
  privilege: number;
  userpage: string;
  notes: string;
  badges: number[];
}

export const saveAdminUser = (id: number, body: UserEdit) =>
  siteApi.post(`/admin/users/${id}`, body);

export const userAction = (id: number, body: { action: string } & Record<string, unknown>) =>
  siteApi.post(`/admin/users/${id}/action`, body);

export interface HwidMatch {
  userId: number;
  username: string;
  logId: number;
  mac: string;
  uniqueId: string;
  diskId: string;
  hits: boolean[];
  exact: boolean;
}

export interface HwidRow {
  id: number;
  seen: number;
  mac: string;
  uniqueId: string;
  diskId: string;
  empty: boolean[];
  matches: HwidMatch[];
}

export const hwidLogs = (id: number, page: number, signal?: AbortSignal) =>
  siteApi.get<{ total: number; pages: number; rows: HwidRow[] }>(
    `/admin/users/${id}/hwid`,
    { page },
    signal
  );

export interface IpRow {
  userid: number;
  ip: string;
  occurencies: number;
  username: string;
}

export const userIps = (id: number, signal?: AbortSignal) =>
  siteApi.get<IpRow[]>(`/admin/users/${id}/ips`, undefined, signal);

export const ipUsers = (ip: string, signal?: AbortSignal) =>
  siteApi.get<IpRow[]>(`/admin/ips/${encodeURIComponent(ip)}`, undefined, signal);
