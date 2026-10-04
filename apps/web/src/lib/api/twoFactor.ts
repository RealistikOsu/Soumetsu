import { api } from './client';
import type { LoginResult } from './users';

export interface TwoFactorStatus {
  enabled: boolean;
  // Staff can't use their privileges without it, so it can't be turned off.
  required: boolean;
  recovery_codes_left: number;
}

export const twoFactorStatus = (signal?: AbortSignal) =>
  api.get<TwoFactorStatus>('/auth/2fa', undefined, signal);

// Staff start setup from an emailed link, so a stolen password alone can't attach an authenticator.
export const sendSetupLink = () => api.post('/auth/2fa/setup-link');

export const startSetup = (setupToken: string | null) =>
  api.post<{ secret: string; uri: string }>('/auth/2fa/setup', { setup_token: setupToken });

export const confirmSetup = (code: string) =>
  api.post<{ recovery_codes: string[] }>('/auth/2fa/setup/confirm', { code });

export const newRecoveryCodes = (code: string) =>
  api.post<{ recovery_codes: string[] }>('/auth/2fa/recovery-codes', { code });

export const disableTwoFactor = (code: string) => api.post('/auth/2fa/disable', { code });

export const loginWithCode = (challenge: string, code: string) =>
  api.post<LoginResult>('/auth/2fa/login', { challenge, code });

export const sessionInfo = () =>
  api.get<{ user_id: number; privileges: number; mfa: boolean }>('/auth/session');
