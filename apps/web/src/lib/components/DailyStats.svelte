<script lang="ts">
  import type { DailyStats } from '$lib/api/dailyChallenge';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let {
    daily,
    onmore
  }: {
    daily: DailyStats;
    // Given on the overview, which shows the short version and links to the full one.
    onmore?: () => void;
  } = $props();

  const days = (count: number) => m.profile_daily_days({ count: number(count) });
  const weeks = (count: number) => m.profile_daily_weeks({ count: number(count) });
</script>

<h2 class="section-title c-purple">
  <i class="fa-solid fa-calendar-day"></i><a class="title-link" href="/daily-challenge"
    >{m.profile_daily_label()}</a
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
<div class="panel c-purple streak-panel">
  <div class="streaks">
    <div>
      <b>{days(daily.current_daily_streak)}</b><small>{m.profile_daily_streak_daily()}</small>
    </div>
    <div>
      <b>{weeks(daily.current_weekly_streak)}</b><small>{m.profile_daily_streak_weekly()}</small>
    </div>
  </div>
  <dl class="streak-list">
    <div>
      <dt>{m.profile_daily_total()}</dt>
      <dd>{days(daily.total_days)}</dd>
    </div>
    {#if !onmore}
      <div>
        <dt>{m.profile_daily_best_daily()}</dt>
        <dd>{days(daily.best_daily_streak)}</dd>
      </div>
      <div>
        <dt>{m.profile_daily_best_weekly()}</dt>
        <dd>{weeks(daily.best_weekly_streak)}</dd>
      </div>
    {/if}
    <div>
      <dt>{m.profile_daily_top_10()}</dt>
      <dd>{number(daily.top_10_placements)}</dd>
    </div>
    {#if !onmore}
      <div>
        <dt>{m.profile_daily_top_50()}</dt>
        <dd>{number(daily.top_50_placements)}</dd>
      </div>
    {/if}
  </dl>
</div>
