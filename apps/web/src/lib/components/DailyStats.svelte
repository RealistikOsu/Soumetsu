<script lang="ts">
  import type { DailyStats } from '$lib/api/dailyChallenge';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let { daily }: { daily: DailyStats } = $props();

  let open = $state(false);
  let root = $state<HTMLElement>();

  const days = (count: number) => m.profile_daily_days({ count: number(count) });
  const weeks = (count: number) => m.profile_daily_weeks({ count: number(count) });
</script>

<svelte:window
  onclick={(event) => {
    if (open && !root?.contains(event.target as Node)) open = false;
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape') open = false;
  }}
/>

<div class="daily" class:open bind:this={root}>
  <button type="button" class="daily-toggle" aria-expanded={open} onclick={() => (open = !open)}>
    <span>{m.profile_daily_label()}</span>
    <b>{days(daily.total_days)}</b>
  </button>
  <div class="daily-card" role="group" aria-label={m.profile_daily_label()}>
    <div class="daily-head">
      <span>{m.profile_daily_total()}<b>{days(daily.total_days)}</b></span>
      <span>{m.profile_daily_streak_daily()}<b>{days(daily.current_daily_streak)}</b></span>
      <span>{m.profile_daily_streak_weekly()}<b>{weeks(daily.current_weekly_streak)}</b></span>
    </div>
    <dl class="daily-list">
      <div>
        <dt>{m.profile_daily_best_daily()}</dt>
        <dd>{days(daily.best_daily_streak)}</dd>
      </div>
      <div>
        <dt>{m.profile_daily_best_weekly()}</dt>
        <dd>{weeks(daily.best_weekly_streak)}</dd>
      </div>
      <div>
        <dt>{m.profile_daily_top_10()}</dt>
        <dd>{number(daily.top_10_placements)}</dd>
      </div>
      <div>
        <dt>{m.profile_daily_top_50()}</dt>
        <dd>{number(daily.top_50_placements)}</dd>
      </div>
    </dl>
  </div>
</div>
