<script lang="ts">
  import type { Streaks } from '$lib/api/commissions';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let {
    stats,
    onmore
  }: {
    stats: Streaks;
    // Given on the overview, which shows the short version and links to the full one.
    onmore?: () => void;
  } = $props();

  const days = (count: number) => m.profile_daily_days({ count: number(count) });
  const weeks = (count: number) => m.profile_daily_weeks({ count: number(count) });
</script>

<h2 class="section-title c-teal">
  <i class="fa-solid fa-list-check"></i><a class="title-link" href="/commissions"
    >{m.profile_commissions_label()}</a
  >
  {#if onmore}
    <a
      href="?tab=activity"
      onclick={(event) => {
        event.preventDefault();
        onmore();
      }}>{m.profile_more()}</a
    >
  {/if}
</h2>
<div class="panel c-teal streak-panel">
  <div class="streaks">
    <div>
      <b>{days(stats.currentDailyStreak)}</b><small>{m.profile_commissions_streak_daily()}</small>
    </div>
    <div>
      <b>{weeks(stats.currentWeeklyStreak)}</b><small>{m.profile_commissions_streak_weekly()}</small
      >
    </div>
  </div>
  <dl class="streak-list">
    <div>
      <dt>{m.profile_commissions_total()}</dt>
      <dd>{days(stats.totalDays)}</dd>
    </div>
    <div>
      <dt>{m.profile_daily_best_daily()}</dt>
      <dd>{days(stats.bestDailyStreak)}</dd>
    </div>
    {#if !onmore}
      <div>
        <dt>{m.profile_daily_best_weekly()}</dt>
        <dd>{weeks(stats.bestWeeklyStreak)}</dd>
      </div>
    {/if}
  </dl>
</div>
