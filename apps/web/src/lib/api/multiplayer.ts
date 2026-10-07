import { api } from './client';
import {
  MATCHES_PAGE_SIZE,
  type BeatmapRef,
  type MatchBase,
  type Participant,
  type UserMatchList,
  type UserRef
} from './rankedPlay';

export interface MatchSummary extends MatchBase {
  host: UserRef | null;
}

export interface MatchSummaryPage {
  match: MatchSummary;
  participants: Participant[];
  maps: { game: number; mode: number; mods: number; beatmap: BeatmapRef }[];
}

export interface GameScore {
  user: UserRef;
  team: number;
  score: number;
  accuracy: number;
  max_combo: number;
  passed: boolean;
  mods: number;
  grade: string;
  statistics: {
    count_300: number;
    count_100: number;
    count_50: number;
    count_miss: number;
    count_geki: number;
    count_katu: number;
  };
}

export interface Game {
  number: number;
  started_at: string;
  ended_at: string | null;
  mode: number;
  mods: number;
  win_condition: number;
  team_type: number;
  beatmap: BeatmapRef;
  scores: GameScore[];
}

export type MatchEvent =
  | {
      type: 'joined' | 'left' | 'disbanded' | 'game_ended';
      at: string;
      user: UserRef | null;
      game?: number;
    }
  | { type: 'game'; at: string; game: Game };

export interface MatchEvents {
  match: MatchSummary;
  events: MatchEvent[];
}

export const userMatches = (id: number, page: number, signal?: AbortSignal) =>
  api.get<UserMatchList<MatchSummary>>(
    `/users/${id}/multiplayer/matches`,
    { page, limit: MATCHES_PAGE_SIZE },
    signal
  );

export const matchSummary = (id: number, signal?: AbortSignal) =>
  api.get<MatchSummaryPage>(`/multiplayer/matches/${id}`, undefined, signal);

export const matchEvents = (id: number, signal?: AbortSignal) =>
  api.get<MatchEvents>(`/multiplayer/matches/${id}/events`, undefined, signal);
