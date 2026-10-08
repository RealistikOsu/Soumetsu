import type { DayScore } from '../scores';
import { any, once, pick, template, type Params, type Template } from './types';

// NC and DC are the speed mods' stronger forms, so they satisfy DT and HT.
export const has = (score: DayScore, mod: string) =>
  score.mods.includes(mod) ||
  (mod === 'DT' && score.mods.includes('NC')) ||
  (mod === 'HT' && score.mods.includes('DC'));

const SINGLES = ['HD', 'HR', 'DT', 'FL', 'EZ', 'HT', 'NF', 'SD', 'PF', 'SO'];

const on = (
  key: string,
  tier: Template['tier'],
  predicate: (s: DayScore, params: Params) => boolean,
  roll: Template['roll'] = once
) =>
  template({
    key,
    family: 'mods',
    tier,
    roll,
    target: () => 1,
    check: (ctx, params) => any(ctx, (s) => predicate(s, params))
  });

export const mods: Template[] = [
  on(
    'mods_single',
    'easy',
    (s, params) => has(s, String(params.mod)),
    (ctx, _settings, random) => ({
      mod: pick(ctx.favouriteMode === 3 ? [...SINGLES, 'FI', 'MR'] : SINGLES, random)
    })
  ),
  on('mods_two', 'medium', (s) => s.mods.length >= 2),
  on('mods_three', 'hard', (s) => s.mods.length >= 3),
  on('mods_hdhr', 'medium', (s) => has(s, 'HD') && has(s, 'HR')),
  on('mods_hddt', 'hard', (s) => has(s, 'HD') && has(s, 'DT')),
  on('mods_rate', 'easy', (s) => s.rate !== 1),
  on('mods_rate_range', 'medium', (s) => s.rate >= 1.1 && s.rate <= 1.4),
  on('mods_ez_acc', 'medium', (s) => has(s, 'EZ') && s.accuracy >= 95),
  on('mods_ht_fc', 'medium', (s) => has(s, 'HT') && s.misses === 0),
  on('mods_dt_s', 'hard', (s) => has(s, 'DT') && s.grade.startsWith('S')),
  on('mods_fl_pass', 'medium', (s) => has(s, 'FL')),
  on('mods_nf_pass', 'easy', (s) => has(s, 'NF')),
  on('mods_sd_pass', 'medium', (s) => has(s, 'SD') || has(s, 'PF')),
  on('mods_relax_stars', 'hard', (s) => s.variant !== 0 && s.map.stars >= 6)
];
