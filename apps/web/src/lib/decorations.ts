export type DecorationTier = 'everyone' | 'supporter' | 'staff';

export interface Decoration {
  key: string;
  name: string;
  category: 'Default' | 'Supporter' | 'Staff';
  tier: DecorationTier;
}

const tiers: Record<Decoration['category'], DecorationTier> = {
  Default: 'everyone',
  Supporter: 'supporter',
  Staff: 'staff'
};

const entry = (category: Decoration['category'], key: string, name: string): Decoration => ({
  key,
  name,
  category,
  tier: tiers[category]
});

export const decorations: Decoration[] = [
  entry('Default', 'red', 'Red'),
  entry('Default', 'orange', 'Orange'),
  entry('Default', 'yellow', 'Yellow'),
  entry('Default', 'green', 'Green'),
  entry('Default', 'cyan', 'Cyan'),
  entry('Default', 'blue', 'Blue'),
  entry('Default', 'purple', 'Purple'),
  entry('Default', 'pink', 'Pink'),
  entry('Default', 'pride', 'Pride'),
  entry('Default', 'trans', 'Trans Pride'),
  entry('Default', 'lesbian', 'Lesbian Pride'),
  entry('Default', 'gay', 'Gay Pride'),
  entry('Default', 'bisexual', 'Bisexual Pride'),
  entry('Default', 'pansexual', 'Pansexual Pride'),
  entry('Default', 'nonbinary', 'Nonbinary Pride'),
  entry('Default', 'asexual', 'Asexual Pride'),
  entry('Supporter', 'violet', 'Violet'),
  entry('Supporter', 'sunset', 'Sunset'),
  entry('Supporter', 'ocean', 'Ocean'),
  entry('Supporter', 'amethyst', 'Amethyst'),
  entry('Supporter', 'aurora', 'Aurora'),
  entry('Supporter', 'ember', 'Ember'),
  entry('Supporter', 'holo', 'Holo'),
  entry('Supporter', 'galaxy', 'Galaxy'),
  entry('Supporter', 'fire', 'Fire'),
  entry('Supporter', 'ice', 'Ice'),
  entry('Supporter', 'beer', 'Beer'),
  entry('Supporter', 'vaporwave', 'Vaporwave'),
  entry('Supporter', 'sakura', 'Sakura'),
  entry('Staff', 'staff-claude', 'Claude'),
  entry('Staff', 'staff-rainbow', 'Rainbow'),
  entry('Staff', 'staff-chrome', 'Chrome'),
  entry('Staff', 'staff-gold', 'Gold'),
  entry('Staff', 'staff-aurora', 'Aurora Borealis'),
  entry('Staff', 'staff-halo', 'Halo'),
  entry('Staff', 'staff-voltage', 'Voltage'),
  entry('Staff', 'staff-glitch', 'Glitch'),
  entry('Staff', 'staff-prism', 'Prism'),
  entry('Staff', 'staff-eclipse', 'Eclipse'),
  entry('Staff', 'staff-pulse', 'Inverse Pulse')
];

export const decorationClass = (key: string | null | undefined) =>
  key && decorations.some((d) => d.key === key) ? `deco-${key}` : '';
