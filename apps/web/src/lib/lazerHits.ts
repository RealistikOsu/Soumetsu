import type { LazerScore } from '$lib/api/lazerScores';
import { m } from '$lib/paraglide/messages';

export interface HitRow {
  key: string;
  label: string;
  value: number;
  // Ticks and bonuses are shown against how many the map had, when the API knows.
  max: number | null;
  colour: string;
}

const order = [
  'perfect',
  'great',
  'good',
  'ok',
  'meh',
  'large_tick_hit',
  'small_tick_hit',
  'slider_tail_hit',
  'small_bonus',
  'large_bonus',
  'small_tick_miss',
  'miss'
];

const outOfMax = new Set([
  'large_tick_hit',
  'small_tick_hit',
  'slider_tail_hit',
  'small_bonus',
  'large_bonus'
]);

const colours: Record<string, string> = {
  perfect: 'var(--teal)',
  great: 'var(--ranked)',
  good: 'var(--purple)',
  ok: 'var(--green)',
  meh: 'var(--yellow)',
  large_tick_hit: 'var(--blue)',
  small_tick_hit: 'var(--lblue)',
  slider_tail_hit: 'var(--pink)',
  small_bonus: 'var(--orange)',
  large_bonus: 'var(--orange)',
  small_tick_miss: 'var(--red)',
  miss: 'var(--red)'
};

// Lazer reuses one set of statistic names across rulesets, so what a tick is depends on the mode.
function labelOf(key: string, mode: number): string | null {
  switch (key) {
    case 'perfect':
      return m.scores_hit_perfect();
    case 'great':
      return m.scores_hit_great();
    case 'good':
      return m.scores_hit_good();
    case 'ok':
      return m.scores_hit_ok();
    case 'meh':
      return m.scores_hit_meh();
    case 'miss':
      return m.scores_hit_miss();
    case 'large_tick_hit':
      return mode === 2 ? m.scores_hit_large_droplet() : m.scores_hit_slider_tick();
    case 'small_tick_hit':
      return mode === 2 ? m.scores_hit_small_droplet() : m.scores_hit_drum_roll_tick();
    case 'small_tick_miss':
      return mode === 2 ? m.scores_hit_droplet_miss() : null;
    case 'slider_tail_hit':
      return m.scores_hit_slider_end();
    case 'small_bonus':
      return m.scores_hit_spinner_tick();
    case 'large_bonus':
      return mode === 1 ? m.scores_hit_strong_bonus() : m.scores_hit_spinner_bonus();
    default:
      return null;
  }
}

export function hitRows(score: LazerScore): HitRow[] {
  const { statistics, maximum_statistics: maximum = {}, play_mode: mode } = score;
  return order.flatMap((key) => {
    if (!(key in statistics) && !(key in maximum)) return [];
    const label = labelOf(key, mode);
    if (!label) return [];
    const value = statistics[key] ?? 0;
    const max = outOfMax.has(key) && key in maximum ? maximum[key] : null;
    // Lazer lists spinner bonuses on every map, including ones with no spinner.
    if (value === 0 && !max && outOfMax.has(key)) return [];
    return [{ key, label, value, max, colour: colours[key] }];
  });
}
