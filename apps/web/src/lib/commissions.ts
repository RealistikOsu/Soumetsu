import type { CommissionTask } from '$lib/api/commissions';
import { modeNames, relaxNames } from '$lib/modes';
import { m } from '$lib/paraglide/messages';

type Params = Record<string, string | number | boolean>;

// Mode and variant arrive as numbers; the messages want their names.
const n = (params: Params) => ({
  mode: typeof params.mode === 'number' ? modeNames[params.mode] : String(params.mode),
  variant: typeof params.variant === 'number' ? relaxNames[params.variant] : String(params.variant),
  source: params.source === 'lazer' ? 'lazer' : 'stable'
});

const ppArgs = (params: Params) => ({
  pp: Number(params.pp),
  mode: n(params).mode,
  variant: n(params).variant
});

const texts: Record<string, (params: Params) => string> = {
  casino_aviator: () => m.commissions_task_casino_aviator(),
  casino_big_win: () => m.commissions_task_casino_big_win(),
  casino_blackjack: () => m.commissions_task_casino_blackjack(),
  casino_chicken: () => m.commissions_task_casino_chicken(),
  casino_lose: () => m.commissions_task_casino_lose(),
  casino_new_game: () => m.commissions_task_casino_new_game(),
  casino_play: () => m.commissions_task_casino_play(),
  casino_profit: () => m.commissions_task_casino_profit(),
  casino_shop: () => m.commissions_task_casino_shop(),
  casino_slots_10x: () => m.commissions_task_casino_slots_10x(),
  casino_three_games: () => m.commissions_task_casino_three_games(),
  casino_wager: (p) => m.commissions_task_casino_wager({ coins: Number(p.coins) }),
  daily_beat: () => m.commissions_task_daily_beat(),
  daily_both: () => m.commissions_task_daily_both(),
  daily_no_miss: () => m.commissions_task_daily_no_miss(),
  daily_play: () => m.commissions_task_daily_play(),
  daily_s: () => m.commissions_task_daily_s(),
  daily_top10: () => m.commissions_task_daily_top10(),
  daily_top50: () => m.commissions_task_daily_top50(),
  leaderboard_first: () => m.commissions_task_leaderboard_first(),
  leaderboard_steal: () => m.commissions_task_leaderboard_steal(),
  leaderboard_three_firsts: () => m.commissions_task_leaderboard_three_firsts(),
  leaderboard_top10: () => m.commissions_task_leaderboard_top10(),
  leaderboard_top50_stars: () => m.commissions_task_leaderboard_top50_stars(),
  login: () => m.commissions_task_login(),
  map_ar: () => m.commissions_task_map_ar(),
  map_artist: (p) => m.commissions_task_map_artist({ artist: String(p.artist) }),
  map_bpm: (p) => m.commissions_task_map_bpm({ bpm: Number(p.bpm) }),
  map_combo: () => m.commissions_task_map_combo(),
  map_diffname: () => m.commissions_task_map_diffname(),
  map_easy_nomod: () => m.commissions_task_map_easy_nomod(),
  map_famous: (p) => m.commissions_task_map_famous({ name: String(p.name) }),
  map_local: () => m.commissions_task_map_local(),
  map_long: (p) => m.commissions_task_map_long({ minutes: Number(p.minutes) }),
  map_loved: () => m.commissions_task_map_loved(),
  map_new: () => m.commissions_task_map_new(),
  map_od: () => m.commissions_task_map_od(),
  map_revisit: () => m.commissions_task_map_revisit(),
  map_set_three: () => m.commissions_task_map_set_three(),
  map_short: () => m.commissions_task_map_short(),
  map_stars: (p) => m.commissions_task_map_stars({ stars: Number(p.stars) }),
  map_stars_hard: (p) => m.commissions_task_map_stars_hard({ stars: Number(p.stars) }),
  map_top_again: () => m.commissions_task_map_top_again(),
  meme_combo: (p) => m.commissions_task_meme_combo({ combo: Number(p.combo) }),
  meme_fail: () => m.commissions_task_meme_fail(),
  mods_dt_s: () => m.commissions_task_mods_dt_s(),
  mods_ez_acc: () => m.commissions_task_mods_ez_acc(),
  mods_fl_pass: () => m.commissions_task_mods_fl_pass(),
  mods_hddt: () => m.commissions_task_mods_hddt(),
  mods_hdhr: () => m.commissions_task_mods_hdhr(),
  mods_ht_fc: () => m.commissions_task_mods_ht_fc(),
  mods_nf_pass: () => m.commissions_task_mods_nf_pass(),
  mods_rate: () => m.commissions_task_mods_rate(),
  mods_rate_range: () => m.commissions_task_mods_rate_range(),
  mods_relax_stars: () => m.commissions_task_mods_relax_stars(),
  mods_sd_pass: () => m.commissions_task_mods_sd_pass(),
  mods_single: (p) => m.commissions_task_mods_single({ mod: String(p.mod) }),
  mods_three: () => m.commissions_task_mods_three(),
  mods_two: () => m.commissions_task_mods_two(),
  mp_play: () => m.commissions_task_mp_play(),
  mp_win: () => m.commissions_task_mp_win(),
  play_all_modes: () => m.commissions_task_play_all_modes(),
  play_both_sources: () => m.commissions_task_play_both_sources(),
  play_count: (p) => m.commissions_task_play_count({ count: Number(p.count) }),
  play_count_many: (p) => m.commissions_task_play_count_many({ count: Number(p.count) }),
  play_maps: (p) => m.commissions_task_play_maps({ count: Number(p.count) }),
  play_mode: (p) => m.commissions_task_play_mode({ count: Number(p.count), mode: n(p).mode }),
  play_not_favourite: (p) =>
    typeof p.mode === 'number'
      ? m.commissions_task_play_not_mode({ mode: n(p).mode })
      : m.commissions_task_play_not_favourite(),
  play_source: (p) => m.commissions_task_play_source({ source: n(p).source }),
  play_two_variants: () => m.commissions_task_play_two_variants(),
  play_variant: (p) =>
    m.commissions_task_play_variant({ count: Number(p.count), variant: n(p).variant }),
  quality_300s: () => m.commissions_task_quality_300s(),
  quality_a: () => m.commissions_task_quality_a(),
  quality_acc: () => m.commissions_task_quality_acc(),
  quality_acc_stars: () => m.commissions_task_quality_acc_stars(),
  quality_choke: () => m.commissions_task_quality_choke(),
  quality_combo: (p) => m.commissions_task_quality_combo({ combo: Number(p.combo) }),
  quality_fc: () => m.commissions_task_quality_fc(),
  quality_fc_stars: () => m.commissions_task_quality_fc_stars(),
  quality_misses: (p) => m.commissions_task_quality_misses({ misses: Number(p.misses) }),
  quality_pb_gain: () => m.commissions_task_quality_pb_gain(),
  quality_pp: (p) =>
    (p.source === 'lazer' ? m.commissions_task_quality_pp_lazer : m.commissions_task_quality_pp)(
      ppArgs(p)
    ),
  quality_pp_hard: (p) =>
    (p.source === 'lazer'
      ? m.commissions_task_quality_pp_hard_lazer
      : m.commissions_task_quality_pp_hard)(ppArgs(p)),
  quality_s: () => m.commissions_task_quality_s(),
  quality_ss: () => m.commissions_task_quality_ss(),
  quality_ss_stars: () => m.commissions_task_quality_ss_stars(),
  quality_three_s: () => m.commissions_task_quality_three_s(),
  quality_top10: () => m.commissions_task_quality_top10(),
  quality_top50: () => m.commissions_task_quality_top50(),
  // Tasks rolled before pp tasks had a source count every play.
  quality_total_pp: (p) =>
    p.source === undefined
      ? m.commissions_task_quality_total_pp({ pp: Number(p.pp) })
      : (p.source === 'lazer'
          ? m.commissions_task_quality_total_pp_mode_lazer
          : m.commissions_task_quality_total_pp_mode)(ppArgs(p)),
  rp_play: () => m.commissions_task_rp_play(),
  rp_rounds: (p) => m.commissions_task_rp_rounds({ count: Number(p.count) }),
  rp_three: () => m.commissions_task_rp_three(),
  rp_win: () => m.commissions_task_rp_win(),
  session_climb: () => m.commissions_task_session_climb(),
  session_minutes: (p) => m.commissions_task_session_minutes({ minutes: Number(p.minutes) }),
  session_retry: () => m.commissions_task_session_retry(),
  session_streak: (p) => m.commissions_task_session_streak({ count: Number(p.count) })
};

export const templateKeys = Object.keys(texts);

export const taskText = (task: Pick<CommissionTask, 'template' | 'params'>) =>
  texts[task.template]?.(task.params) ?? task.template;

export function taskHref(task: CommissionTask) {
  if (task.link === 'casino') return '/casino';
  return task.link;
}
