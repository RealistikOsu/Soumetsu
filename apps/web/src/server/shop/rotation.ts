import { supporterDecorations } from '$lib/decorations';
import type { ShopSettings } from './settings';

export const monthKey = (now: Date) => now.toISOString().slice(0, 7);

function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function supporterPicks(settings: ShopSettings, now: Date): string[] {
  const month = monthKey(now);
  const pinned = settings.supporterPins[month];
  if (pinned) return pinned;

  const keys = supporterDecorations.map((d) => d.key);
  const random = mulberry32(fnv1a(`supporter:${month}`));
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys.slice(0, 3);
}

export function inWindow(settings: ShopSettings, key: string, now: Date): boolean {
  return settings.spotlight.some(
    (w) => w.key === key && new Date(w.from) <= now && now < new Date(w.until)
  );
}
