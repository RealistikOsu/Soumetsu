import { Privilege } from '$lib/auth/privileges';
import { supporterDecorations } from '$lib/decorations';
import { allowed } from '$lib/modes';
import { record } from '$server/admin/console';
import { rename, takenBy, wipeStats } from '$server/admin/users';
import { db } from '$server/db';
import type { Prisma } from '$server/generated/client';
import { redis } from '$server/redis';
import { Failure } from '$server/respond';
import {
  isItemType,
  isShopDecoration,
  loanActive,
  onSale,
  SUPPORTER_PREFIX,
  type ItemType
} from './listing';
import { supporterPicks } from './rotation';
import { loadShopSettings, type ShopSettings } from './settings';

type Variant = 'va' | 'rx' | 'ap';
const VARIANTS: Variant[] = ['va', 'rx', 'ap'];
const USERNAME = /^[A-Za-z0-9 _[\]-]{2,15}$/;

export function parseWipe(metadata: Record<string, unknown>): {
  modes: number[];
  types: Variant[];
} {
  const { mode, variant } = metadata;
  const validMode =
    mode === 'all' ||
    (typeof mode === 'number' && Number.isInteger(mode) && mode >= 0 && mode <= 3);
  const validVariant = variant === 'all' || VARIANTS.includes(variant as Variant);
  if (!validMode || !validVariant) throw new Failure(400, 'site.invalid_request');
  if (
    typeof mode === 'number' &&
    variant !== 'all' &&
    !allowed(mode, VARIANTS.indexOf(variant as Variant))
  )
    throw new Failure(400, 'site.invalid_request');
  return {
    modes: mode === 'all' ? [0, 1, 2, 3] : [mode as number],
    types: variant === 'all' ? [...VARIANTS] : [variant as Variant]
  };
}

export function parseUsername(metadata: Record<string, unknown>): string {
  const raw = metadata.new_username;
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!USERNAME.test(name) || (name.includes('_') && name.includes(' ')))
    throw new Failure(400, 'shop.username_invalid');
  return name;
}

// The same checks rename() makes, run before the coins move so a refused name never costs anything.
async function checkName(userId: number, name: string, current: string) {
  if (name === current) throw new Failure(400, 'shop.username_invalid');
  if (await takenBy(name, userId)) throw new Failure(409, 'shop.username_taken');
  const safe = name.toLowerCase().replace(/ /g, '_');
  const holders = await db.$queryRaw<unknown[]>`
    SELECT id FROM users WHERE username_safe = ${safe} AND id <> ${userId} LIMIT 1`;
  // The casino stored reserved names in their safe form.
  const reserved = await db.$queryRaw<unknown[]>`
    SELECT user_id FROM user_name_history WHERE username = ${safe} AND user_id <> ${userId} LIMIT 1`;
  if (holders.length || reserved.length) throw new Failure(409, 'shop.username_taken');
}

// rename() can fail after it has written the new name (history cleanup, kick, action log). The player has
// what they paid for by then, so the purchase stands.
async function renameLanded(userId: number, name: string) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { username: true, username_safe: true }
  });
  return user?.username === name && user.username_safe === name.toLowerCase().replace(/ /g, '_');
}

interface Resolved {
  id: number;
  type: ItemType;
  key: string | null;
  price: number;
}

// A purchase must reference a shop_items row, and the monthly supporter picks have none, so each supporter
// decoration gets a disabled row the first time it sells. Disabled keeps it out of the normal listing.
async function supporterRow(tx: Prisma.TransactionClient, key: string, settings: ShopSettings) {
  const decoration = supporterDecorations.find((d) => d.key === key)!;
  await tx.$executeRaw`
    INSERT IGNORE INTO shop_items (type, item_key, name, description, price, enabled, sort_order)
    VALUES ('decoration', ${key}, ${decoration.name}, 'Supporter decoration', ${settings.supporterPrice}, 0, 1000)`;
  // A locking read sees a row another buyer committed after this transaction's snapshot was taken. Shared,
  // because two first buyers both hold a shared lock from the INSERT IGNORE and would deadlock upgrading it.
  const [row] = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM shop_items WHERE type = 'decoration' AND item_key = ${key} FOR SHARE`;
  return Number(row.id);
}

async function resolve(
  tx: Prisma.TransactionClient,
  item: number | string,
  settings: ShopSettings,
  now: Date
): Promise<Resolved> {
  if (typeof item === 'string') {
    const key = item.startsWith(SUPPORTER_PREFIX) ? item.slice(SUPPORTER_PREFIX.length) : '';
    if (
      !supporterPicks(settings, now).includes(key) ||
      !supporterDecorations.some((d) => d.key === key)
    )
      throw new Failure(404, 'shop.unavailable');
    return {
      id: await supporterRow(tx, key, settings),
      type: 'decoration',
      key,
      price: settings.supporterPrice
    };
  }

  const row = Number.isInteger(item)
    ? await tx.shop_items.findUnique({ where: { id: item } })
    : null;
  if (!row || !row.enabled) throw new Failure(404, 'shop.unavailable');
  const type = row.type;
  if (!isItemType(type)) throw new Failure(404, 'shop.unavailable');
  if (
    type === 'decoration' &&
    !(isShopDecoration(row.item_key) && onSale(settings, row.item_key, now))
  )
    throw new Failure(404, 'shop.unavailable');
  return { id: row.id, type, key: row.item_key, price: row.price };
}

export async function buy(
  userId: number,
  item: number | string,
  metadata: Record<string, unknown>,
  now = new Date()
): Promise<{ balance: number }> {
  if ((await redis.set(`soumetsu:shop:${userId}`, '1', 'EX', 5, 'NX')) !== 'OK')
    throw new Failure(429, 'shop.too_fast');
  const settings = await loadShopSettings();

  let username = '';
  let scope: ReturnType<typeof parseWipe> | null = null;

  const bought = await db.$transaction(async (tx) => {
    const [user] = await tx.$queryRaw<
      { coins: number; username: string; name_decoration: string | null; privileges: bigint }[]
    >`SELECT coins, username, name_decoration, privileges FROM users WHERE id = ${userId} FOR UPDATE`;
    if (!user) throw new Failure(404, 'users.user_not_found');
    if ((Number(user.privileges) & Privilege.Public) === 0)
      throw new Failure(403, 'site.forbidden');
    if (await loanActive(tx, userId)) throw new Failure(403, 'shop.loan_active');

    const target = await resolve(tx, item, settings, now);
    if (target.type === 'decoration') {
      const owned = await tx.user_decorations.findUnique({
        where: { user_id_decoration: { user_id: userId, decoration: target.key! } }
      });
      if (owned) throw new Failure(409, 'shop.already_owned');
    }
    if (target.type === 'custom_badge') {
      const [stats] = await tx.$queryRaw<{ can_custom_badge: number }[]>`
        SELECT can_custom_badge FROM users_stats WHERE id = ${userId}`;
      if (stats && Number(stats.can_custom_badge)) throw new Failure(409, 'shop.already_owned');
    }
    if (user.coins < target.price) throw new Failure(402, 'shop.insufficient_coins');

    let stored: Prisma.InputJsonObject | undefined;
    if (target.type === 'username_change') {
      username = parseUsername(metadata);
      await checkName(userId, username, user.username);
      stored = { new_username: username };
    } else if (target.type === 'score_wipe') {
      scope = parseWipe(metadata);
      stored = { mode: metadata.mode as number | string, variant: metadata.variant as string };
    }

    await tx.$executeRaw`UPDATE users SET coins = coins - ${target.price} WHERE id = ${userId}`;
    const purchase = await tx.shop_purchases.create({
      data: {
        user_id: userId,
        item_id: target.id,
        price_paid: target.price,
        metadata: stored,
        bought_at: now
      },
      select: { id: true }
    });

    if (target.type === 'decoration') {
      await tx.user_decorations.create({
        data: { user_id: userId, decoration: target.key!, price_paid: target.price, bought_at: now }
      });
      if (!user.name_decoration)
        await tx.users.update({ where: { id: userId }, data: { name_decoration: target.key } });
    }

    return { ...target, purchase: purchase.id, balance: user.coins - target.price };
  });

  try {
    if (bought.type === 'username_change') {
      if (await rename(userId, userId, username, false))
        throw new Failure(409, 'shop.username_taken');
    } else if (bought.type === 'custom_badge') {
      await db.$executeRaw`UPDATE users_stats SET can_custom_badge = 1 WHERE id = ${userId}`;
    } else if (bought.type === 'score_wipe' && scope) {
      await wipeStats(userId, scope);
    }
  } catch (error) {
    let landed = false;
    try {
      landed = bought.type === 'username_change' && (await renameLanded(userId, username));
      if (!landed) {
        await db.$transaction([
          db.$executeRaw`UPDATE users SET coins = coins + ${bought.price} WHERE id = ${userId}`,
          db.shop_purchases.delete({ where: { id: bought.purchase } })
        ]);
      }
    } catch (refundError) {
      await record('error', userId, refundError);
    }
    await record('error', userId, error);
    if (landed) return { balance: bought.balance };
    throw error;
  }

  return { balance: bought.balance };
}
