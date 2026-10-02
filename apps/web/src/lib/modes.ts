export const modeNames = ['osu!', 'Taiko', 'Catch', 'Mania'];
export const relaxNames = ['Vanilla', 'Relax', 'Autopilot'];
export const relaxColours = ['c-yellow', 'c-pink', 'c-purple'];

// The names the leaderboard URL uses, as on prod.
export const modeSlugs = ['osu', 'taiko', 'fruits', 'mania'];
export const relaxSlugs = ['vn', 'rx', 'ap'];

const available: Record<number, number[]> = { 0: [0, 1, 2, 3], 1: [0, 1, 2], 2: [0] };

// Relax has no mania, and autopilot is osu! only.
export const allowed = (mode: number, rx: number) => available[rx]?.includes(mode) ?? false;

// Panes slide in from the side of the tab that was picked.
export function slideTowards(from: { mode: number; rx: number }, to: { mode: number; rx: number }) {
  const direction = Math.sign(to.rx * 4 + to.mode - (from.rx * 4 + from.mode));
  document.documentElement.style.setProperty('--slide', String(direction));
}

export function readMode(params: URLSearchParams) {
  const rx = available[Number(params.get('rx'))] ? Number(params.get('rx')) : 0;
  const mode = allowed(Number(params.get('mode')), rx) ? Number(params.get('mode')) : 0;
  return { mode, rx };
}
