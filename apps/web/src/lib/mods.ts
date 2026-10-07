export interface Mod {
  acronym: string;
  settings: { speed_change?: number; adjust_pitch?: boolean } | null;
}

const DEFAULT_RATE: Record<string, number> = { DT: 1.5, NC: 1.5, HT: 0.75 };

// The API always lists CL first, and PF also implies SD, so neither is shown.
const hidden = (mod: Mod, all: Mod[]) =>
  mod.acronym === 'CL' || (mod.acronym === 'SD' && all.some((m) => m.acronym === 'PF'));

// Custom rates are shown on the mod they change, like +DT(1.35x).
export function modsText(mods: Mod[]) {
  const names = mods
    .filter((mod) => !hidden(mod, mods))
    .map((mod) => {
      const rate = mod.settings?.speed_change;
      const custom = rate && Math.abs(rate - (DEFAULT_RATE[mod.acronym] ?? 1)) > 0.001;
      return custom ? `${mod.acronym}(${rate}x)` : mod.acronym;
    });
  return names.length ? `+${names.join('')}` : '';
}

export const hasMod = (mods: Mod[], acronym: string) => mods.some((m) => m.acronym === acronym);

const STABLE_MODS = [
  'NF',
  'EZ',
  'TD',
  'HD',
  'HR',
  'SD',
  'DT',
  'RX',
  'HT',
  'NC',
  'FL',
  'AT',
  'SO',
  'AP',
  'PF',
  '4K',
  '5K',
  '6K',
  '7K',
  '8K',
  'FI',
  'RD',
  'CN',
  'TP',
  '9K',
  'CO',
  '1K',
  '3K',
  '2K',
  'V2',
  'MR'
];

// Stable sets DT with NC and SD with PF, so only the stronger one is listed.
export function modAcronyms(bits: number) {
  const set = (acronym: string) => Boolean(bits & (1 << STABLE_MODS.indexOf(acronym)));
  return STABLE_MODS.filter(
    (acronym) =>
      set(acronym) && !(acronym === 'DT' && set('NC')) && !(acronym === 'SD' && set('PF'))
  );
}
