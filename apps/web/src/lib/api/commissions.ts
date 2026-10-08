import { siteApi } from './client';

export interface Threshold {
  points: number;
  coins: number;
}

export interface CommissionTask {
  id: number;
  template: string;
  params: Record<string, string | number | boolean>;
  link: string | null;
  points: number;
  target: number;
  progress: number;
  completed: boolean;
}

export interface CommissionDay {
  date: string;
  endsAt: string;
  settlesAt: string;
  points: number;
  claimedTier: number;
  completedAt: string | null;
  thresholds: Threshold[];
  tasks: CommissionTask[];
}

export interface Streaks {
  totalDays: number;
  currentDailyStreak: number;
  bestDailyStreak: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
}

export const commissions = (signal?: AbortSignal) =>
  siteApi.get<{ day: CommissionDay; previous: CommissionDay | null; streaks: Streaks }>(
    '/commissions',
    undefined,
    signal
  );

export const claimTier = (tier: number, day?: string) =>
  siteApi.post<{ balance: number }>('/commissions/claim', { tier, day });

export const commissionStreaks = (id: number, signal?: AbortSignal) =>
  siteApi.get<Streaks>(`/users/${id}/commissions`, undefined, signal);
