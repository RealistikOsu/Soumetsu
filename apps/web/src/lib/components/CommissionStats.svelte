<script lang="ts">
  import type { Streaks } from '$lib/api/commissions';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let { stats }: { stats: Streaks } = $props();

  const days = (count: number) => m.commissions_days({ count: number(count) });
  const weeks = (count: number) => m.commissions_weeks({ count: number(count) });
</script>

<section class="daily" aria-label={m.profile_commissions_label()}>
  <h3><a href="/commissions">{m.profile_commissions_label()}</a></h3>
  <div class="daily-head">
    <span>{m.profile_commissions_total()}<b>{days(stats.totalDays)}</b></span>
    <span>{m.profile_commissions_streak_daily()}<b>{days(stats.currentDailyStreak)}</b></span>
    <span>{m.profile_commissions_streak_weekly()}<b>{weeks(stats.currentWeeklyStreak)}</b></span>
  </div>
  <dl class="daily-list">
    <div>
      <dt>{m.profile_daily_best_daily()}</dt>
      <dd>{days(stats.bestDailyStreak)}</dd>
    </div>
    <div>
      <dt>{m.profile_daily_best_weekly()}</dt>
      <dd>{weeks(stats.bestWeeklyStreak)}</dd>
    </div>
  </dl>
</section>
