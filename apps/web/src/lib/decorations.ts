import { m } from '$lib/paraglide/messages';

export type DecorationTier = 'everyone' | 'supporter' | 'staff' | 'shop';

export interface Decoration {
  key: string;
  readonly name: string;
  category: 'Default' | 'Supporter' | 'Staff' | 'Shop';
  tier: DecorationTier;
  stock?: 'permanent' | 'spotlight';
}

const tiers: Record<Decoration['category'], DecorationTier> = {
  Default: 'everyone',
  Supporter: 'supporter',
  Staff: 'staff',
  Shop: 'shop'
};

const entry = (
  category: Decoration['category'],
  key: string,
  name: () => string,
  stock?: Decoration['stock']
): Decoration => ({
  key,
  get name() {
    return name();
  },
  category,
  tier: tiers[category],
  stock
});

export const decorations: Decoration[] = [
  entry('Default', 'red', m.common_decoration_red),
  entry('Default', 'orange', m.common_decoration_orange),
  entry('Default', 'yellow', m.common_decoration_yellow),
  entry('Default', 'green', m.common_decoration_green),
  entry('Default', 'cyan', m.common_decoration_cyan),
  entry('Default', 'blue', m.common_decoration_blue),
  entry('Default', 'purple', m.common_decoration_purple),
  entry('Default', 'pink', m.common_decoration_pink),
  entry('Default', 'pride', m.common_decoration_pride),
  entry('Default', 'trans', m.common_decoration_trans),
  entry('Default', 'lesbian', m.common_decoration_lesbian),
  entry('Default', 'gay', m.common_decoration_gay),
  entry('Default', 'bisexual', m.common_decoration_bisexual),
  entry('Default', 'pansexual', m.common_decoration_pansexual),
  entry('Default', 'nonbinary', m.common_decoration_nonbinary),
  entry('Default', 'asexual', m.common_decoration_asexual),
  entry('Supporter', 'violet', m.common_decoration_violet),
  entry('Supporter', 'sunset', m.common_decoration_sunset),
  entry('Supporter', 'ocean', m.common_decoration_ocean),
  entry('Supporter', 'amethyst', m.common_decoration_amethyst),
  entry('Supporter', 'aurora', m.common_decoration_aurora),
  entry('Supporter', 'ember', m.common_decoration_ember),
  entry('Supporter', 'holo', m.common_decoration_holo),
  entry('Supporter', 'galaxy', m.common_decoration_galaxy),
  entry('Supporter', 'fire', m.common_decoration_fire),
  entry('Supporter', 'ice', m.common_decoration_ice),
  entry('Supporter', 'beer', m.common_decoration_beer),
  entry('Supporter', 'vaporwave', m.common_decoration_vaporwave),
  entry('Supporter', 'sakura', m.common_decoration_sakura),
  entry('Staff', 'staff-claude', m.common_decoration_staff_claude),
  entry('Staff', 'staff-rainbow', m.common_decoration_staff_rainbow),
  entry('Staff', 'staff-chrome', m.common_decoration_staff_chrome),
  entry('Staff', 'staff-gold', m.common_decoration_staff_gold),
  entry('Staff', 'staff-aurora', m.common_decoration_staff_aurora),
  entry('Staff', 'staff-halo', m.common_decoration_staff_halo),
  entry('Staff', 'staff-voltage', m.common_decoration_staff_voltage),
  entry('Staff', 'staff-glitch', m.common_decoration_staff_glitch),
  entry('Staff', 'staff-prism', m.common_decoration_staff_prism),
  entry('Staff', 'staff-eclipse', m.common_decoration_staff_eclipse),
  entry('Staff', 'staff-pulse', m.common_decoration_staff_pulse),
  entry('Shop', 'candy', m.common_decoration_candy, 'permanent'),
  entry('Shop', 'midnight', m.common_decoration_midnight, 'permanent'),
  entry('Shop', 'neon', m.common_decoration_neon, 'permanent'),
  entry('Shop', 'mint', m.common_decoration_mint, 'permanent'),
  entry('Shop', 'lava', m.common_decoration_lava, 'permanent'),
  entry('Shop', 'foil', m.common_decoration_foil, 'permanent'),
  entry('Shop', 'toxic', m.common_decoration_toxic, 'permanent'),
  entry('Shop', 'cash', m.common_decoration_cash, 'permanent'),
  entry('Shop', 'copper', m.common_decoration_copper, 'permanent'),
  entry('Shop', 'platinum', m.common_decoration_platinum, 'permanent'),
  entry('Shop', 'diamond', m.common_decoration_diamond, 'permanent'),
  entry('Shop', 'bullion', m.common_decoration_bullion, 'permanent'),
  entry('Shop', 'jackpot', m.common_decoration_jackpot, 'permanent'),
  entry('Shop', 'royal', m.common_decoration_royal, 'spotlight'),
  entry('Shop', 'coral', m.common_decoration_coral, 'spotlight'),
  entry('Shop', 'storm', m.common_decoration_storm, 'spotlight')
];

export const shopDecorations = decorations.filter((d) => d.category === 'Shop');
export const supporterDecorations = decorations.filter((d) => d.category === 'Supporter');

export const decorationClass = (key: string | null | undefined) =>
  key && decorations.some((d) => d.key === key) ? `deco-${key}` : '';
