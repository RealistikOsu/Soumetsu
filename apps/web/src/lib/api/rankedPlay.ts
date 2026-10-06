import { api } from './client';

export interface UserRef {
  id: number;
  username: string;
  country: string;
}

export interface BeatmapRef {
  id: number;
  set_id: number;
  artist: string;
  title: string;
  version: string;
  creator: string;
  ranked_status: number;
  star_rating: number | null;
  mode: number;
}

export interface MatchSummary {
  id: number;
  name: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
  winner_id: number | null;
  map_count: number;
  players: UserRef[];
  star_min: number | null;
  star_max: number | null;
  cover_set_ids: number[];
}

export interface UserMatches {
  active: MatchSummary[];
  ended: MatchSummary[];
  total_ended: number;
}

export interface Participant {
  user: UserRef;
  rank: number;
  accuracy: number;
  play_count: number;
  total_score: number;
}

export interface MatchSummaryPage {
  match: MatchSummary;
  participants: Participant[];
  maps: { round: number; ruleset: number; beatmap: BeatmapRef }[];
}

export interface RoundScore {
  user: UserRef;
  total_score: number;
  accuracy: number;
  max_combo: number;
  rank: string;
  passed: boolean;
  statistics: { great: number; ok: number; meh: number; miss: number };
}

export interface Round {
  number: number;
  started_at: string;
  ended_at: string | null;
  ruleset: number;
  beatmap: BeatmapRef;
  scores: RoundScore[];
}

export type MatchEvent =
  | {
      type: 'joined' | 'left' | 'disbanded' | 'round_ended';
      at: string;
      user: UserRef | null;
      round?: number;
    }
  | { type: 'round'; at: string; round: Round };

export interface MatchEvents {
  match: MatchSummary;
  events: MatchEvent[];
}

export const MATCHES_PAGE_SIZE = 20;

export const userMatches = (id: number, page: number, signal?: AbortSignal) =>
  api.get<UserMatches>(
    `/users/${id}/ranked-play/matches`,
    { page, limit: MATCHES_PAGE_SIZE },
    signal
  );

export const matchSummary = (id: number, signal?: AbortSignal) =>
  api.get<MatchSummaryPage>(`/ranked-play/matches/${id}`, undefined, signal);

export const matchEvents = (id: number, signal?: AbortSignal) =>
  api.get<MatchEvents>(`/ranked-play/matches/${id}/events`, undefined, signal);
