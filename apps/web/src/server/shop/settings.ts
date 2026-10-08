import type { Prisma } from '$server/generated/client';
import { db } from '$server/db';
import { Failure } from '$server/respond';
import { rapLog } from '$server/admin/log';
import { shopDecorations, supporterDecorations } from '$lib/decorations';

export interface ShopSettings {
  supporterPrice: number;
  spotlight: { key: string; from: string; until: string }[];
  supporterPins: Record<string, string[]>;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  supporterPrice: 4000,
  spotlight: [],
  supporterPins: {}
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parseShopSettings(raw: unknown): ShopSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;

  if (!Number.isInteger(input.supporterPrice) || (input.supporterPrice as number) <= 0) return null;

  const spotlight = input.spotlight ?? [];
  if (!Array.isArray(spotlight)) return null;
  const shopKeys = shopDecorations.map((d) => d.key);
  for (const window of spotlight) {
    if (!window || typeof window !== 'object') return null;
    const { key, from, until } = window as Record<string, unknown>;
    if (typeof key !== 'string' || !shopKeys.includes(key)) return null;
    if (typeof from !== 'string' || typeof until !== 'string') return null;
    const start = Date.parse(from);
    const end = Date.parse(until);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  }

  const pins = input.supporterPins ?? {};
  if (typeof pins !== 'object' || pins === null || Array.isArray(pins)) return null;
  const supporterKeys = supporterDecorations.map((d) => d.key);
  for (const [month, keys] of Object.entries(pins)) {
    if (!MONTH.test(month) || !Array.isArray(keys) || keys.length !== 3) return null;
    if (new Set(keys).size !== 3) return null;
    if (!keys.every((key) => typeof key === 'string' && supporterKeys.includes(key))) return null;
  }

  return {
    supporterPrice: input.supporterPrice as number,
    spotlight: (spotlight as ShopSettings['spotlight']).map(({ key, from, until }) => ({
      key,
      from,
      until
    })),
    supporterPins: pins as Record<string, string[]>
  };
}

export async function loadShopSettings(): Promise<ShopSettings> {
  const row = await db.shop_settings.findUnique({ where: { id: 1 } });
  return (row && parseShopSettings(row.settings)) ?? DEFAULT_SHOP_SETTINGS;
}

export async function saveShopSettings(staffId: number, raw: unknown) {
  const settings = parseShopSettings(raw);
  if (!settings) throw new Failure(400, 'site.invalid_request');
  // ShopSettings is an interface, which Prisma's Json input type won't accept without a cast.
  const json = settings as unknown as Prisma.InputJsonObject;
  await db.shop_settings.upsert({
    where: { id: 1 },
    create: { id: 1, settings: json, updated_at: new Date() },
    update: { settings: json, updated_at: new Date() }
  });
  await rapLog(staffId, 'updated the shop settings');
  return settings;
}
