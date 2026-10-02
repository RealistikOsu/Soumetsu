const MODS = [
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
  'K4',
  'K5',
  'K6',
  'K7',
  'K8',
  'FI',
  'RD',
  'CN',
  'TG',
  'K9',
  'KC',
  'K1',
  'K3',
  'K2',
  'V2',
  'MR'
];

// Same shape the API gives for a mod list: CL first, NC replacing DT, speed on the rate-changing mods.
export function modList(bits: number, rate: number) {
  const mods: {
    acronym: string;
    settings: { speed_change: number; adjust_pitch: boolean } | null;
  }[] = [{ acronym: 'CL', settings: null }];
  const withoutDt = bits & (1 << 9) ? bits & ~(1 << 6) : bits;
  MODS.forEach((acronym, i) => {
    if (!(withoutDt & (1 << i))) return;
    const speed = ['DT', 'HT', 'NC'].includes(acronym);
    mods.push({
      acronym,
      settings: speed
        ? { speed_change: Math.round(rate * 100) / 100, adjust_pitch: acronym === 'NC' }
        : null
    });
  });
  return mods;
}
