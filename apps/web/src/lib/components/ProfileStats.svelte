<script lang="ts">
  import { CountUp } from '@soumetsu/ui';
  import type { UserStats } from '$lib/api/users';
  import { number } from '$lib/format';
  import { level } from '$lib/level';

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
  <div title={peakRank ? `Peak rank: #${number(peakRank)}` : undefined}>
    Global<b>
      {#if stats.global_rank}#<CountUp value={stats.global_rank} />{:else}-{/if}
    </b>
  </div>
  <div>
    {country}<b>
      {#if stats.country_rank}#<CountUp value={stats.country_rank} />{:else}-{/if}
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
    <dt>Accuracy</dt>
    <dd>{number(stats.accuracy, 2)}%</dd>
  </div>
  <div>
    <dt>Maximum combo</dt>
    <dd>{number(stats.max_combo)}</dd>
  </div>
  <div>
    <dt>Ranked score</dt>
    <dd>{number(stats.ranked_score)}</dd>
  </div>
  <div>
    <dt>Total score</dt>
    <dd>{number(stats.total_score)}</dd>
  </div>
  <div>
    <dt>Playcount</dt>
    <dd>{number(stats.playcount)}</dd>
  </div>
  <div>
    <dt>Replay views</dt>
    <dd>{number(stats.replays_watched)}</dd>
  </div>
  <div>
    <dt>Total hits</dt>
    <dd>{number(stats.total_hits)}</dd>
  </div>
</dl>
