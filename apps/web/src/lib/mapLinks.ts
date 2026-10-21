export interface MapRef {
  beatmap?: number;
  set?: number;
}

// Reads osu! and our own beatmap links. A set link that ends in a difficulty means that difficulty,
// and a bare number could be either a beatmap or a set.
export function mapRef(text: string): MapRef | null {
  const term = text.trim();
  if (/^\d{1,10}$/.test(term)) return { beatmap: Number(term), set: Number(term) };

  const set = term.match(/\/beatmapsets\/(\d+)(?:\/?#[a-z]+\/(\d+))?/i);
  if (set) return set[2] ? { beatmap: Number(set[2]) } : { set: Number(set[1]) };

  const beatmap = term.match(/\/(?:beatmaps|b)\/(\d+)/i);
  if (beatmap) return { beatmap: Number(beatmap[1]) };

  const legacySet = term.match(/osu\.ppy\.sh\/s\/(\d+)/i);
  return legacySet ? { set: Number(legacySet[1]) } : null;
}
