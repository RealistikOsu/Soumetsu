import type { Mod } from '$lib/mods';
import { config } from './config';
import { db } from './db';

// The performance service picks relax and autopilot (and the 2019 calculator) from the legacy bitfield, and
// takes the lazer list alongside it for custom rates.
const LEGACY: Record<string, number> = {
  NF: 1,
  EZ: 2,
  TD: 4,
  HD: 8,
  HR: 16,
  SD: 32,
  DT: 64,
  RX: 128,
  HT: 256,
  NC: 512 | 64,
  FL: 1024,
  SO: 4096,
  AP: 8192,
  PF: 16384 | 32,
  '4K': 32768,
  '5K': 65536,
  '6K': 131072,
  '7K': 262144,
  '8K': 524288,
  FI: 1048576,
  '9K': 16777216,
  MR: 1073741824
};

export interface Counts {
  n300: number;
  n100: number;
  n50: number;
  geki: number;
  katu: number;
  miss: number;
}

// osu!'s accuracy per mode, as a percentage.
function accuracy(mode: number, c: Counts) {
  if (mode === 1) return ((c.n300 + c.n100 / 2) / (c.n300 + c.n100 + c.miss)) * 100;
  if (mode === 2) {
    const caught = c.n300 + c.n100 + c.n50;
    return (caught / (caught + c.katu + c.miss)) * 100;
  }
  if (mode === 3) {
    const hit = 300 * (c.geki + c.n300) + 200 * c.katu + 100 * c.n100 + 50 * c.n50;
    const all = c.geki + c.n300 + c.katu + c.n100 + c.n50 + c.miss;
    return (hit / (300 * all)) * 100;
  }
  return (
    ((300 * c.n300 + 100 * c.n100 + 50 * c.n50) / (300 * (c.n300 + c.n100 + c.n50 + c.miss))) * 100
  );
}

// What the score would give with every miss hit perfectly and the whole map comboed.
export async function fullComboPp(beatmapId: number, mode: number, mods: Mod[], counts: Counts) {
  const map = await db.beatmaps.findUnique({
    where: { beatmap_id: beatmapId },
    select: { max_combo: true }
  });
  if (!map) return null;

  const fc = { ...counts, miss: 0 };
  if (mode === 3) fc.geki += counts.miss;
  else fc.n300 += counts.miss;

  const response = await fetch(`${config.performanceUrl}/api/v1/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      {
        beatmap_id: beatmapId,
        mode,
        mods: mods.reduce((bits, mod) => bits | (LEGACY[mod.acronym] ?? 0), 0),
        lazer_mods: mods,
        max_combo: map.max_combo,
        accuracy: accuracy(mode, fc),
        miss_count: 0
      }
    ]),
    signal: AbortSignal.timeout(4000)
  }).catch(() => null);
  if (!response?.ok) return null;
  const results = (await response.json().catch(() => null)) as { pp?: number }[] | null;
  return results?.[0]?.pp ?? null;
}
