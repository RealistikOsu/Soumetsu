import { shopDecorations, supporterDecorations } from '$lib/decorations';
import { db } from '$server/db';
import type { Prisma } from '$server/generated/client';
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
  loanActive: boolean;
  items: ShopItemView[];
  supporterPicks: { month: string; price: number; items: ShopItemView[] };
  owned: string[];
}

type Client = Prisma.TransactionClient | typeof db;

export const SUPPORTER_PREFIX = 'supporter:';

// casino_loans belongs to the casino, so a deployment without it simply has no loans.
export async function loanActive(client: Client, userId: number) {
  const rows = await client.$queryRaw<unknown[]>`
    SELECT 1 FROM casino_loans WHERE user_id = ${userId} AND paid_off = 0 LIMIT 1`.catch(
    (error) => {
      if (String(error).includes("doesn't exist")) return [];
      throw error;
    }
  );
  return rows.length > 0;
}

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
  const [user, settings, owned, rows, loan] = await Promise.all([
    db.users.findUnique({ where: { id: userId }, select: { coins: true } }),
    loadShopSettings(),
    ownedKeys(userId),
    db.shop_items.findMany({
      where: { enabled: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
    }),
    loanActive(db, userId)
  ]);
  if (!user) throw new Failure(404, 'users.user_not_found');

  const items: ShopItemView[] = [];
  for (const row of rows) {
    const type = row.type;
    if (!isItemType(type)) continue;
    if (type === 'decoration') {
      if (!isShopDecoration(row.item_key)) continue;
      const spotlight = shopDecorations.find((d) => d.key === row.item_key)?.stock === 'spotlight';
      items.push({
        id: row.id,
        type,
        key: row.item_key,
        name: row.name,
        description: row.description,
        price: row.price,
        owned: owned.includes(row.item_key),
        available: onSale(settings, row.item_key, now),
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
      owned: false,
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
    loanActive: loan,
    items,
    supporterPicks: { month: monthKey(now), price: settings.supporterPrice, items: picks },
    owned
  };
}
