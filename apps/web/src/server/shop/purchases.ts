import { db } from '$server/db';
import type { Purchase } from '$lib/api/shop';

type ItemType = Purchase['item']['type'];

export async function purchasesFor(userId: number): Promise<Purchase[]> {
  const rows = await db.shop_purchases.findMany({
    where: { user_id: userId },
    orderBy: [{ bought_at: 'desc' }, { id: 'desc' }],
    include: { item: true }
  });
  return rows.map((r) => ({
    id: Number(r.id),
    item: { type: r.item.type as ItemType, key: r.item.item_key, name: r.item.name },
    price_paid: r.price_paid,
    bought_at: r.bought_at.toISOString()
  }));
}
