import { api } from './client';

export interface Stats {
  online_users: number;
  registered_users: number;
}

export const stats = (signal?: AbortSignal) => api.get<Stats>('/stats/', undefined, signal);
