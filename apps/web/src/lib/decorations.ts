import { m } from '$lib/paraglide/messages';

export type DecorationTier = 'everyone' | 'supporter' | 'staff';

export interface Decoration {
  key: string;
  readonly name: string;
  category: 'Default' | 'Supporter' | 'Staff';
  tier: DecorationTier;
}

const tiers: Record<Decoration['category'], DecorationTier> = {
  Default: 'everyone',
  Supporter: 'supporter',
  Staff: 'staff'
};

const entry = (category: Decoration['category'], key: string, name: () => string): Decoration => ({
  key,
  get name() {
    return name();
  },
  category,
  tier: tiers[category]
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
  entry('Staff', 'staff-pulse', m.common_decoration_staff_pulse)
];

export const decorationClass = (key: string | null | undefined) =>
  key && decorations.some((d) => d.key === key) ? `deco-${key}` : '';
