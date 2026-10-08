import { Privilege } from '$lib/auth/privileges';
import { shopDecorations, supporterDecorations } from '$lib/decorations';
import { db } from '$server/db';
import { Failure } from '$server/respond';
import { ownedKeys } from './catalogue';
import { inWindow, monthKey, supporterPicks } from './rotation';
import { loadShopSettings, type ShopSettings } from './settings';

export const ITEM_TYPES = ['decoration', 'username_change', 'custom_badge', 'score_wipe'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const isItemType = (type: string): type is ItemType =>
  (ITEM_TYPES as readonly string[]).includes(type);

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

export const SUPPORTER_PREFIX = 'supporter:';

export function isShopDecoration(key: string | null): key is string {
  return shopDecorations.some((d) => d.key === key);
}

export function onSale(settings: ShopSettings, key: string, now: Date) {
  const decoration = shopDecorations.find((d) => d.key === key);
  return decoration?.stock === 'permanent' || inWindow(settings, key, now);
}

// Overlapping windows extend each other, so the end is wherever the chain of windows runs out.
function windowEnd(settings: ShopSettings, key: string, now: Date) {
  let end = now;
  for (;;) {
    const next = settings.spotlight
      .filter((w) => w.key === key && new Date(w.from) <= end && end < new Date(w.until))
      .reduce((latest, w) => Math.max(latest, Date.parse(w.until)), end.getTime());
    if (next === end.getTime()) break;
    end = new Date(next);
  }
  return end.getTime() === now.getTime() ? null : end.toISOString();
}

const nextMonth = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

export async function shopFor(userId: number, now = new Date()): Promise<ShopView> {
  const [user, stats, settings, owned, rows] = await Promise.all([
    db.users.findUnique({ where: { id: userId }, select: { coins: true, privileges: true } }),
    db.users_stats.findUnique({ where: { id: userId }, select: { can_custom_badge: true } }),
    loadShopSettings(),
    ownedKeys(userId),
    db.shop_items.findMany({
      where: { enabled: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
    })
  ]);
  if (!user) throw new Failure(404, 'users.user_not_found');

  const items: ShopItemView[] = [];
  for (const row of rows) {
    const type = row.type;
    if (!isItemType(type)) continue;
    if (type === 'decoration') {
      if (!isShopDecoration(row.item_key)) continue;
      const spotlight = shopDecorations.find((d) => d.key === row.item_key)?.stock === 'spotlight';
      const available = onSale(settings, row.item_key, now);
      const has = owned.includes(row.item_key);
      if (spotlight && !available && !has) continue;
      items.push({
        id: row.id,
        type,
        key: row.item_key,
        name: row.name,
        description: row.description,
        price: row.price,
        owned: has,
        available,
        until: spotlight ? windowEnd(settings, row.item_key, now) : null
      });
      continue;
    }
    items.push({
      id: row.id,
      type,
      key: null,
      name: row.name,
      description: row.description,
      price: row.price,
      owned: type === 'custom_badge' && !!stats?.can_custom_badge,
      available: true,
      until: null
    });
  }

  const until = nextMonth(now);
  const picks = supporterPicks(settings, now).flatMap((key) => {
    const decoration = supporterDecorations.find((d) => d.key === key);
    if (!decoration) return [];
    return [
      {
        id: `${SUPPORTER_PREFIX}${key}`,
        type: 'decoration' as const,
        key,
        name: decoration.name,
        description: 'Supporter decoration',
        price: settings.supporterPrice,
        owned: owned.includes(key),
        available: true,
        until
      }
    ];
  });

  return {
    balance: user.coins,
    restricted: (Number(user.privileges) & Privilege.Public) === 0,
    items,
    supporterPicks: { month: monthKey(now), price: settings.supporterPrice, items: picks },
    owned
  };
}
