import { db } from '$server/db';
import { Failure } from '$server/respond';
import { PAGE_SIZE } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import { loadShopSettings } from '$server/shop/settings';
import { monthKey, supporterPicks } from '$server/shop/rotation';
import { ownedKeys, pickable } from '$server/shop/catalogue';
import { shopDecorations, supporterDecorations } from '$lib/decorations';

export const listItems = () =>
  db.shop_items.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] });

export async function updateItem(staffId: number, body: Record<string, unknown>) {
  const { id, price, enabled, sort_order } = body;
  if (
    !Number.isInteger(id) ||
    !Number.isInteger(price) ||
    (price as number) < 1 ||
    !Number.isInteger(sort_order) ||
    typeof enabled !== 'boolean'
  ) {
    throw new Failure(400, 'site.invalid_request');
  }

  const item = await db.shop_items.findUnique({ where: { id: id as number } });
  if (!item) throw new Failure(404, 'site.invalid_request');

  await db.shop_items.update({
    where: { id: item.id },
    data: { price: price as number, enabled, sort_order: sort_order as number }
  });
  await rapLog(
    staffId,
    `updated shop item ${item.name} (price ${price}, ${enabled ? 'enabled' : 'disabled'}, sort ${sort_order})`
  );
}

export async function purchasesPage(page: number) {
  const [total, rows] = await Promise.all([
    db.shop_purchases.count(),
    db.shop_purchases.findMany({
      orderBy: [{ bought_at: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { item: true }
    })
  ]);
  const users = await db.users.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.user_id))] } },
    select: { id: true, username: true }
  });
  const names = new Map(users.map((u) => [u.id, u.username]));

  return {
    total,
    purchases: rows.map((r) => ({
      id: Number(r.id),
      user_id: r.user_id,
      username: names.get(r.user_id) ?? String(r.user_id),
      item: { type: r.item.type, key: r.item.item_key, name: r.item.name },
      price_paid: r.price_paid,
      bought_at: r.bought_at.toISOString()
    }))
  };
}

function checkKey(key: unknown): string {
  const keys = [...supporterDecorations, ...shopDecorations].map((d) => d.key);
  if (typeof key !== 'string' || !keys.includes(key))
    throw new Failure(400, 'site.invalid_request');
  return key;
}

async function checkUser(userId: number) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { username: true, privileges: true }
  });
  if (!user) throw new Failure(404, 'users.user_not_found');
  return user;
}

export async function grantDecoration(staffId: number, userId: number, raw: unknown) {
  const key = checkKey(raw);
  const { username } = await checkUser(userId);
  await db.user_decorations.createMany({
    data: [{ user_id: userId, decoration: key, price_paid: 0, bought_at: new Date() }],
    skipDuplicates: true
  });
  await rapLog(staffId, `granted the ${key} decoration to ${username}`);
}

export async function revokeDecoration(staffId: number, userId: number, raw: unknown) {
  const key = checkKey(raw);
  const { username, privileges } = await checkUser(userId);
  await db.user_decorations.deleteMany({ where: { user_id: userId, decoration: key } });
  // A supporter or staff member keeps the style through their tag, so only a lost style comes off.
  if (!pickable(key, { privileges: Number(privileges), owned: await ownedKeys(userId) })) {
    await db.users.updateMany({
      where: { id: userId, name_decoration: key },
      data: { name_decoration: null }
    });
  }
  await rapLog(staffId, `revoked the ${key} decoration from ${username}`);
}

export async function settingsWithPicks() {
  const settings = await loadShopSettings();
  const now = new Date();
  return { ...settings, picks: { month: monthKey(now), keys: supporterPicks(settings, now) } };
}
