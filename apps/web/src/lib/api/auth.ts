import { siteApi } from './client';

export type AccountStatus = 'pending' | 'active' | 'banned';

export const registerAccount = (body: {
  username: string;
  email: string;
  password: string;
  captcha?: string;
}) => siteApi.post<{ user_id: number; username: string }>('/register', body);

export const registerCheck = (signal?: AbortSignal) =>
  siteApi.get<{ username: string | null }>('/register/check', undefined, signal);

export const registerStatus = (userId: number, signal?: AbortSignal) =>
  siteApi.get<AccountStatus>('/register/status', { u: userId }, signal);

export const resumeVerification = (username: string, password: string) =>
  siteApi.post<number>('/register/resume', { username, password });

export const requestReset = (username: string, captcha?: string) =>
  siteApi.post('/pwreset', { username, captcha });

export const resetOwner = (key: string, signal?: AbortSignal) =>
  siteApi.get<{ username: string }>('/pwreset/continue', { k: key }, signal);

export const finishReset = (key: string, password: string) =>
  siteApi.post('/pwreset/continue', { k: key, password });
