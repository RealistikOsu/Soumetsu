export const modeNames = ['osu!', 'Taiko', 'Catch', 'Mania'];
export const relaxNames = ['Vanilla', 'Relax', 'Autopilot', 'Lazer', 'Lazer RX', 'Lazer AP'];
export const relaxColours = ['c-yellow', 'c-pink', 'c-purple', 'c-teal', 'c-teal', 'c-teal'];

// The names the leaderboard URL uses, as on prod.
export const modeSlugs = ['osu', 'taiko', 'fruits', 'mania'];
export const relaxSlugs = ['vn', 'rx', 'ap', 'lz', 'lzrx', 'lzap'];

const available: Record<number, number[]> = {
  0: [0, 1, 2, 3],
  1: [0, 1, 2],
  2: [0],
  3: [0, 1, 2, 3],
  4: [0, 1, 2],
  5: [0]
};

// Lazer has no replays, pinned scores, first places, clan stats or history graphs here.
export const isLazer = (rx: number) => rx >= 3;

export const parseRx = (value: string | null) => (available[Number(value)] ? Number(value) : 0);

// Relax has no mania, and autopilot is osu! only.
export const allowed = (mode: number, rx: number) => available[rx]?.includes(mode) ?? false;

// Panes slide in from the side of the tab that was picked.
export function slideTowards(from: { mode: number; rx: number }, to: { mode: number; rx: number }) {
  const direction = Math.sign(to.rx * 4 + to.mode - (from.rx * 4 + from.mode));
  document.documentElement.style.setProperty('--slide', String(direction));
}

// Only the clan pages read it, and clans have no lazer stats.
export function readMode(params: URLSearchParams) {
  const asked = parseRx(params.get('rx'));
  const rx = isLazer(asked) ? 0 : asked;
  const mode = allowed(Number(params.get('mode')), rx) ? Number(params.get('mode')) : 0;
  return { mode, rx };
}
