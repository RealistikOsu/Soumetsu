import { siteApi } from './client';

export type ItemType = 'decoration' | 'username_change' | 'custom_badge' | 'score_wipe';

export interface ShopItemView {
  id: number | string;
  type: ItemType;
  key: string | null;
  name: string;
  description: string;
  price: number;
  owned: boolean;
  available: boolean;
  until: string | null;
}

export interface ShopView {
  balance: number;
  restricted: boolean;
  items: ShopItemView[];
  supporterPicks: { month: string; price: number; items: ShopItemView[] };
  owned: string[];
}

export interface Purchase {
  id: number;
  item: { type: ItemType; key: string | null; name: string };
  price_paid: number;
  bought_at: string;
}

export const shop = (signal?: AbortSignal) => siteApi.get<ShopView>('/shop', undefined, signal);

export const buyItem = (item: number | string, metadata?: Record<string, unknown>) =>
  siteApi.post<{ balance: number }>('/shop/buy', { item, metadata });

export const purchases = (signal?: AbortSignal) =>
  siteApi.get<Purchase[]>('/shop/purchases', undefined, signal);
