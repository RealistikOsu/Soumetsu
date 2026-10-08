import type { ItemType } from '$lib/api/shop';
import { decorations } from '$lib/decorations';
import { m } from '$lib/paraglide/messages';

interface Item {
  type: ItemType;
  key: string | null;
  name: string;
}

const names: Partial<Record<ItemType, () => string>> = {
  username_change: m.shop_item_username_change,
  custom_badge: m.shop_item_custom_badge,
  score_wipe: m.shop_item_score_wipe
};

const descriptions: Partial<Record<ItemType, () => string>> = {
  username_change: m.shop_item_username_change_desc,
  custom_badge: m.shop_item_custom_badge_desc,
  score_wipe: m.shop_item_score_wipe_desc
};

export function itemName(item: Item) {
  if (item.type === 'decoration')
    return decorations.find((d) => d.key === item.key)?.name ?? item.name;
  return names[item.type]?.() ?? item.name;
}

export const itemDescription = (item: Item & { description: string }) =>
  descriptions[item.type]?.() ?? item.description;
