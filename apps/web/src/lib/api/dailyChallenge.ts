import { api } from './client';

export interface DailyStats {
  total_days: number;
  current_daily_streak: number;
  current_weekly_streak: number;
  best_daily_streak: number;
  best_weekly_streak: number;
  top_10_placements: number;
  top_50_placements: number;
}

export const dailyStats = (id: number, signal?: AbortSignal) =>
  api.get<DailyStats>(`/users/${id}/daily-challenge`, undefined, signal);
