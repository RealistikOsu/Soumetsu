import { api } from './client';
import { siteApi } from './site';

export interface Card {
  id: number;
  username: string;
  country: string;
  global_rank: number;
  country_rank: number;
  is_online: boolean;
  pp: number;
  accuracy: number;
}

export interface CardExtras {
  online: boolean;
  decoration: string | null;
  lastSeen: number;
  clan: { id: number; tag: string; name: string } | null;
  group: string | null;
}

export const card = (id: number, signal?: AbortSignal) =>
  api.get<Card>(`/users/${id}/card`, undefined, signal);

export const cardExtras = (id: number, signal?: AbortSignal) =>
  siteApi.get<CardExtras>(`/users/${id}/card`, undefined, signal);
