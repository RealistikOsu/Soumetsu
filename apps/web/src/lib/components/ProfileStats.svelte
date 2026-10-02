<script lang="ts">
  import { CountUp } from '@soumetsu/ui';
  import type { UserStats } from '$lib/api/users';
  import { number } from '$lib/format';
  import { level } from '$lib/level';
  import { m } from '$lib/paraglide/messages';

  let {
    stats,
    country,
    peakRank
  }: {
    stats: UserStats;
    country: string;
    peakRank: number | null;
  } = $props();

  const value = $derived(level(stats.total_score));
  const whole = $derived(Math.floor(value));
  const progress = $derived(Math.round((value - whole) * 100));
</script>

<div class="ranks">
  <div title={peakRank ? m.profile_stats_peak_rank({ rank: number(peakRank) }) : undefined}>
    {m.profile_stats_global()}<b>
      {#if stats.global_rank}<CountUp prefix="#" value={stats.global_rank} />{:else}-{/if}
    </b>
  </div>
  <div>
    {country}<b>
      {#if stats.country_rank}<CountUp prefix="#" value={stats.country_rank} />{:else}-{/if}
    </b>
  </div>
  <div class="total">PP<b><CountUp value={stats.pp} /></b></div>
</div>

<div class="level">
  <b>{whole}</b>
  <div class="level-bar"><span style="width: {progress}%"></span></div>
  <span class="muted">{progress}%</span>
</div>

<dl class="stats">
  <div>
    <dt>{m.profile_stats_accuracy()}</dt>
    <dd>{number(stats.accuracy, 2)}%</dd>
  </div>
  <div>
    <dt>{m.profile_stats_max_combo()}</dt>
    <dd>{number(stats.max_combo)}</dd>
  </div>
  <div>
    <dt>{m.profile_stats_ranked_score()}</dt>
    <dd>{number(stats.ranked_score)}</dd>
  </div>
  <div>
    <dt>{m.profile_stats_total_score()}</dt>
    <dd>{number(stats.total_score)}</dd>
  </div>
  <div>
    <dt>{m.profile_stats_playcount()}</dt>
    <dd>{number(stats.playcount)}</dd>
  </div>
  <div>
    <dt>{m.profile_stats_replay_views()}</dt>
    <dd>{number(stats.replays_watched)}</dd>
  </div>
  <div>
    <dt>{m.profile_stats_total_hits()}</dt>
    <dd>{number(stats.total_hits)}</dd>
  </div>
</dl>
