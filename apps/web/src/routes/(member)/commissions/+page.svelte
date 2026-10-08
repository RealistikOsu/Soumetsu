<script lang="ts">
  import { claimTier, commissions, type CommissionDay } from '$lib/api/commissions';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { coins } from '$lib/coins.svelte';
  import { taskHref, taskText } from '$lib/commissions';
  import Banner from '$lib/components/Banner.svelte';
  import { flash } from '$lib/flash.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const info = query((signal) => commissions(signal));
  const day = $derived(info.state.status === 'ready' ? info.state.data.day : null);
  const previous = $derived(info.state.status === 'ready' ? info.state.data.previous : null);
  const streaks = $derived(info.state.status === 'ready' ? info.state.data.streaks : null);
  let busy = $state(false);

  const top = (d: CommissionDay) => d.thresholds[d.thresholds.length - 1].points;
  const percent = (d: CommissionDay) => Math.min(100, Math.round((d.points / top(d)) * 100));

  async function claim(d: CommissionDay, tier: number) {
    busy = true;
    try {
      const { balance } = await claimTier(tier, d.date);
      coins.set(balance);
      flash.show(
        'success',
        m.commissions_claimed_toast({ coins: number(d.thresholds[tier - 1].coins) })
      );
      info.reload();
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }
</script>

{#snippet bar(d: CommissionDay)}
  <div class="cm-track"><span style="width: {percent(d)}%"></span></div>
  <ol class="cm-tiers">
    {#each d.thresholds as threshold, index (threshold.points)}
      {@const tier = index + 1}
      {@const reached = d.points >= threshold.points}
      {@const claimable = reached && d.claimedTier === tier - 1}
      <li class:reached class:claimed={d.claimedTier >= tier}>
        <span>{m.commissions_points({ points: number(threshold.points) })}</span>
        {#if d.claimedTier >= tier}
          <b>{m.commissions_claimed()}</b>
        {:else}
          <button
            class="btn btn-blue"
            type="button"
            disabled={!claimable || busy}
            onclick={() => claim(d, tier)}
          >
            {m.commissions_claim({ coins: number(threshold.coins) })}
          </button>
        {/if}
      </li>
    {/each}
  </ol>
  <b class="cm-total">{m.commissions_points({ points: number(d.points) })}</b>
{/snippet}

<svelte:head><title>{m.commissions_title()} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg"><h1>{m.commissions_title()}</h1></Banner>

<main class="wrap cm">
  {#if day}
    <p class="cm-intro">
      {m.commissions_intro()} <span class="muted">{m.commissions_resets()}</span>
    </p>

    {#if previous}
      <section class="cm-bar panel">
        <h2 class="cm-day">
          {m.commissions_yesterday()}
          <span class="muted"
            >{m.commissions_header_badge({
              done: previous.tasks.filter((task) => task.completed).length,
              total: previous.tasks.length
            })}</span
          >
        </h2>
        {@render bar(previous)}
      </section>
    {/if}

    <section class="cm-bar panel">
      {@render bar(day)}
    </section>

    <ul class="cm-tasks">
      {#each day.tasks as task (task.id)}
        {@const href = taskHref(task)}
        <li class="panel cm-task" class:done={task.completed}>
          <i class="fa-solid {task.completed ? 'fa-circle-check' : 'fa-circle'}" aria-hidden="true"
          ></i>
          <div>
            {#if href}<a {href}>{taskText(task)}</a>{:else}<span>{taskText(task)}</span>{/if}
            {#if task.template.startsWith('daily_top')}<small>{m.commissions_settles()}</small>{/if}
          </div>
          <span class="cm-progress">
            {#if task.completed}{m.commissions_done()}{:else}{m.commissions_progress({
                progress: number(task.progress),
                target: number(task.target)
              })}{/if}
          </span>
          <b>+{task.points}</b>
        </li>
      {/each}
    </ul>

    {#if streaks}
      <dl class="cm-streaks">
        <div>
          <dt>{m.commissions_total_days()}</dt>
          <dd>{m.commissions_days({ count: streaks.totalDays })}</dd>
        </div>
        <div>
          <dt>{m.commissions_streak_daily()}</dt>
          <dd>{m.commissions_days({ count: streaks.currentDailyStreak })}</dd>
        </div>
        <div>
          <dt>{m.commissions_streak_weekly()}</dt>
          <dd>{m.commissions_weeks({ count: streaks.currentWeeklyStreak })}</dd>
        </div>
      </dl>
    {/if}
  {:else if info.state.status === 'error'}
    <p class="muted">{describe(info.state.error)}</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 320px"></span></div>
  {/if}
</main>
