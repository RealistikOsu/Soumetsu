import { api } from './client';
import { siteApi } from './site';

export type LeaderboardSort = 'pp' | 'score' | 'coins';

export interface LeaderboardEntry {
  id: number;
  username: string;
  country: string;
  privileges: number;
  chosen_mode: {
    pp: number;
    accuracy: number;
    playcount: number;
    level: number;
    ranked_score: number;
  };
  global_rank: number;
  country_rank: number;
  coins: number;
}

export const PAGE_SIZE = 50;

export function leaderboard(
  params: { mode: number; rx: number; sort: LeaderboardSort; page: number; country: string },
  signal?: AbortSignal
) {
  const path = params.country
    ? `/leaderboard/country/${params.country.toLowerCase()}`
    : '/leaderboard/';
  return api.get<LeaderboardEntry[]>(
    path,
    {
      mode: params.mode,
      custom_mode: params.rx,
      page: params.page,
      limit: PAGE_SIZE,
      sort: params.sort
    },
    signal
  );
}

export const countries = (limit: number, signal?: AbortSignal) =>
  siteApi.get<string[]>('/countries', { limit }, signal);
