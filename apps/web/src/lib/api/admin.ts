import type { GradeName } from '$lib/grades';
import type { Mod } from '$lib/mods';
import { siteApi } from './site';

export interface DashboardPlay {
  id: number;
  username: string;
  userid: number;
  country: string;
  time: number;
  pp: number;
  mods: Mod[];
  accuracy: number;
  song_name: string;
  beatmap_id: number;
  custom: number;
  grade: GradeName;
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
    // One bit per mode: bit (mode + relax * 4); 0 when not whitelisted at all.
    whitelistModes: number;
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

export interface LogRow {
  id: number;
  userid: number;
  username: string | null;
  text: string;
  datetime: number;
  through: string;
}

export const actionLogs = (page: number, q: string, signal?: AbortSignal) =>
  siteApi.get<{ pages: number; rows: LogRow[] }>('/admin/logs', { page, q }, signal);

export interface BanLogRow {
  from_id: number;
  from_name: string;
  to_id: number;
  to_name: string;
  ts: number;
  summary: string;
  detail: string;
}

export const banLogs = (page: number, signal?: AbortSignal) =>
  siteApi.get<{ pages: number; rows: BanLogRow[] }>('/admin/ban-logs', { page }, signal);

export interface ConsoleRow {
  level: 'error' | 'warning';
  userId: number | null;
  username: string | null;
  message: string;
  stack: string;
  time: number;
}

export const consoleLogs = (page: number, signal?: AbortSignal) =>
  siteApi.get<{ pages: number; rows: ConsoleRow[] }>('/console', { page }, signal);

export interface StatsData {
  days: { end: number; registered: number }[];
  active: number;
  restricted: number;
  plays: DashboardPlay[];
}

export const adminStats = (minPp: number, signal?: AbortSignal) =>
  siteApi.get<StatsData>('/admin/stats', { minpp: minPp }, signal);

export type RankStatus = 'ranked' | 'loved' | 'unranked';

export interface Suggestion {
  beatmapId: number;
  setId: number;
  song: string;
  diff: string;
  cover: string;
  difficulties: number;
  modes: number[];
}

export const suggestions = (signal?: AbortSignal) =>
  siteApi.get<Suggestion[]>('/admin/ranking', undefined, signal);

export interface RankingSet {
  setId: number;
  title: string;
  creator: string | null;
  cover: string;
  difficulties: { id: number; name: string; mode: number; stars: number; ranked: number }[];
}

export const rankingSet = (id: number, signal?: AbortSignal) =>
  siteApi.get<RankingSet>(`/admin/ranking/${id}`, undefined, signal);

export const rankSet = (
  id: number,
  body: { all: RankStatus } | { changes: { beatmapId: number; status: RankStatus }[] }
) => siteApi.post(`/admin/ranking/${id}`, body);

export interface RankRequest {
  id: number;
  time: number;
  setId: number | null;
  song: string;
  cover: string | null;
  difficulties: number;
  modes: number[];
  requester: { id: number; username: string; country: string };
}

export const rankRequests = (page: number, signal?: AbortSignal) =>
  siteApi.get<{ pages: number; requests: RankRequest[] }>('/admin/requests', { page }, signal);

export const dismissRequest = (id: number) => siteApi.delete(`/admin/requests/${id}`);

export interface SystemSettings {
  websiteMaintenance: boolean;
  gameMaintenance: boolean;
  registrations: boolean;
  globalAlert: string;
  homeAlert: string;
}

export const systemSettings = (signal?: AbortSignal) =>
  siteApi.get<SystemSettings>('/admin/settings', undefined, signal);

export const saveSystemSettings = (body: SystemSettings) => siteApi.put('/admin/settings', body);

export interface BanchoSettings {
  maintenance: boolean;
  menuIcon: string;
  loginNotification: string;
}

export const banchoSettings = (signal?: AbortSignal) =>
  siteApi.get<BanchoSettings>('/admin/bancho', undefined, signal);

export const saveBanchoSettings = (body: BanchoSettings) => siteApi.put('/admin/bancho', body);

export interface Badge {
  id: number;
  name: string;
  icon: string;
}

export const badges = (signal?: AbortSignal) =>
  siteApi.get<Badge[]>('/admin/badges', undefined, signal);
export const createBadge = (body: { name: string; icon: string }) =>
  siteApi.post('/admin/badges', body);
export const saveBadge = (id: number, body: { name: string; icon: string }) =>
  siteApi.put(`/admin/badges/${id}`, body);
export const deleteBadge = (id: number) => siteApi.delete(`/admin/badges/${id}`);

export interface PrivilegeGroup {
  id: number;
  name: string;
  privileges: number;
  colour: string;
  tone: string;
}

export interface GroupBody {
  name: string;
  privileges: number;
  colour: string;
}

export const privilegeGroups = (signal?: AbortSignal) =>
  siteApi.get<PrivilegeGroup[]>('/admin/privileges', undefined, signal);
export const createGroup = (body: GroupBody) => siteApi.post('/admin/privileges', body);
export const saveGroup = (id: number, body: GroupBody) =>
  siteApi.put(`/admin/privileges/${id}`, body);
export const deleteGroup = (id: number) => siteApi.delete(`/admin/privileges/${id}`);

export interface ClanRow {
  id: number;
  name: string;
  description: string;
  tag: string;
}

export const adminClans = (page: number, q: string, signal?: AbortSignal) =>
  siteApi.get<{ pages: number; total: number; clans: ClanRow[] }>(
    '/admin/clans',
    { page, q },
    signal
  );

export interface AdminClan {
  id: number;
  name: string;
  tag: string;
  description: string;
  limit: number;
  members: { id: number; username: string; country: string; registered: number; owner: boolean }[];
}

export const adminClan = (id: number, signal?: AbortSignal) =>
  siteApi.get<AdminClan>(`/admin/clans/${id}`, undefined, signal);

export const saveAdminClan = (
  id: number,
  body: { name: string; tag: string; description: string; limit: number }
) => siteApi.put(`/admin/clans/${id}`, body);

export const deleteAdminClan = (id: number) => siteApi.delete(`/admin/clans/${id}`);

export const kickMember = (id: number, userId: number) =>
  siteApi.post(`/admin/clans/${id}/kick`, { userId });

export interface MessageReport {
  id: number;
  reason: string;
  created_at: number;
  content: string;
  sender_id: number;
  sender_name: string;
  reporter_id: number;
  reporter_name: string;
}

export interface ReportedConversation {
  report: {
    id: number;
    message_id: number;
    reason: string;
    created_at: number;
    resolved_at: number | null;
    sender_id: number;
    sender: string;
    reporter_id: number;
    reporter: string;
  };
  messages: { id: number; from: number; content: string; time: number }[];
}

export const messageReports = (signal?: AbortSignal) =>
  siteApi.get<MessageReport[]>('/admin/message-reports', undefined, signal);

export const messageReport = (id: number, signal?: AbortSignal) =>
  siteApi.get<ReportedConversation>(`/admin/message-reports/${id}`, undefined, signal);

export const resolveMessageReport = (id: number) => siteApi.post(`/admin/message-reports/${id}`);

export interface PlayerReport {
  id: number;
  from_uid: number;
  from_name: string | null;
  to_uid: number;
  to_name: string | null;
  reason: string;
  chatlog: string;
  time: number;
  resolved_at: number | null;
  resolved_name: string | null;
}

export const playerReports = (all: boolean, page: number, signal?: AbortSignal) =>
  siteApi.get<{ pages: number; rows: PlayerReport[] }>(
    '/admin/reports',
    { all: all ? 1 : undefined, page },
    signal
  );

export const resolvePlayerReport = (id: number) => siteApi.post(`/admin/reports/${id}`);
