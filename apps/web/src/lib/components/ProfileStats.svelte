<script lang="ts">
  import { CountUp, inView, tabInk } from '@soumetsu/ui';
  import { query } from '$lib/api/query.svelte';
  import type { UserStats } from '$lib/api/users';
  import { profileHistory, type ProfileHistory } from '$lib/api/v1';
  import { number } from '$lib/format';
  import type { GraphPoint } from '$lib/graph';
  import { level } from '$lib/level';
  import { isLazer } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';
  import PeakCard from './PeakCard.svelte';
  import ProfileGraph from './ProfileGraph.svelte';

  let {
    id,
    mode,
    rx,
    stats,
    peakRank,
    rankHistory
  }: {
    id: number;
    mode: number;
    rx: number;
    stats: UserStats;
    peakRank: { rank: number; time: number } | null;
    // Loaded by the profile, which also shows it in the peak rank card; undefined while loading.
    rankHistory: ProfileHistory | undefined;
  } = $props();

  const value = $derived(level(stats.total_score));
  const whole = $derived(Math.floor(value));
  const progress = $derived(Math.round((value - whole) * 100));

  let graph = $state<'rank' | 'pp'>('rank');
  const pps = query((signal) => profileHistory('pp', id, mode, rx, signal));

  // Several captures can land on one day, which draws spikes, so each day keeps its last one.
  const day = (time: number) => Math.floor(time / 86_400_000);
  function pointsOf(rows: GraphPoint[]): GraphPoint[] {
    return rows
      .filter((p) => p.value > 0 && !Number.isNaN(p.time))
      .sort((a, b) => a.time - b.time)
      .filter((p, i, all) => i === all.length - 1 || day(all[i + 1].time) !== day(p.time));
  }

  const history = $derived(
    graph === 'pp'
      ? pps.state
      : rankHistory
        ? { status: 'ready' as const, data: rankHistory }
        : { status: 'loading' as const }
  );
  const points = $derived(
    history.status === 'ready' && history.data.status === 'ready'
      ? pointsOf(history.data.points)
      : null
  );
  const peakHistory = $derived(rankHistory?.status === 'ready' ? rankHistory.points : []);
</script>

<section class="panel profile-strip" class:no-graph={isLazer(rx)}>
  <div class="strip-ranks">
    {#if peakRank && stats.global_rank}
      <div class="global-rank" tabindex="0" role="button" aria-label={m.profile_peak_label()}>
        <small>{m.profile_stats_global()}</small>
        <b><CountUp prefix="#" value={stats.global_rank} /></b>
        <span class="strip-peak">
          <i class="fa-solid fa-crown"></i>{m.profile_peak_label()}
          <b>#{number(peakRank.rank)}</b>
        </span>
        <PeakCard peak={peakRank} current={stats.global_rank} history={peakHistory} />
      </div>
    {:else}
      <div>
        <small>{m.profile_stats_global()}</small>
        <b
          >{#if stats.global_rank}<CountUp prefix="#" value={stats.global_rank} />{:else}-{/if}</b
        >
      </div>
    {/if}
    <div>
      <small>{m.profile_stats_country()}</small>
      <b
        >{#if stats.country_rank}<CountUp prefix="#" value={stats.country_rank} />{:else}-{/if}</b
      >
    </div>
    <div>
      <small>pp</small>
      <b><CountUp value={stats.pp} /></b>
    </div>
  </div>

  {#if !isLazer(rx)}
    <div class="strip-graph">
      <nav class="tabs" use:tabInk>
        {#each [['rank', m.profile_graph_rank()], ['pp', 'PP']] as [key, label] (key)}
          <a
            class:active={graph === key}
            href="?graph={key}"
            onclick={(event) => {
              event.preventDefault();
              graph = key as 'rank' | 'pp';
            }}
          >
            {label}
          </a>
        {/each}
      </nav>
      {#if points && points.length > 1}
        {#key graph}
          <ProfileGraph
            {points}
            bare
            inverted={graph === 'rank'}
            unit={graph === 'pp' ? 'pp' : ''}
          />
        {/key}
      {:else if history.status === 'ready' && history.data.status === 'inactive'}
        <p class="empty-note">{m.profile_graph_inactive()}</p>
      {:else if history.status !== 'loading'}
        <p class="empty-note">{m.profile_graph_empty()}</p>
      {:else}
        <span class="skel" style="width: 100%; height: 130px"></span>
      {/if}
    </div>
  {/if}

  <dl class="strip-figures">
    <div>
      <dt>{m.profile_stats_accuracy()}</dt>
      <dd>{number(stats.accuracy, 2)}%</dd>
    </div>
    <div>
      <dt>{m.profile_stats_playcount()}</dt>
      <dd>{number(stats.playcount)}</dd>
    </div>
    <div>
      <dt>{m.profile_stats_max_combo()}</dt>
      <dd>{number(stats.max_combo)}</dd>
    </div>
    <div>
      <dt>{m.profile_stats_ranked_score()}</dt>
      <dd>{number(stats.ranked_score)}</dd>
    </div>
    {#if !isLazer(rx)}
      <div>
        <dt>{m.profile_section_first_places()}</dt>
        <dd>{number(stats.first_places)}</dd>
      </div>
    {/if}
    <div class="strip-level">
      <dt>{m.profile_stats_level()}</dt>
      <dd>
        {whole}
        <span class="level-bar" use:inView title="{progress}%"
          ><span style="width: {progress}%"></span></span
        >
      </dd>
    </div>
  </dl>

  <details class="strip-more">
    <summary>{m.profile_stats_more()}</summary>
    <dl>
      <div>
        <dt>{m.profile_stats_total_score()}</dt>
        <dd>{number(stats.total_score)}</dd>
      </div>
      <div>
        <dt>{m.profile_stats_total_hits()}</dt>
        <dd>{number(stats.total_hits)}</dd>
      </div>
      <div>
        <dt>{m.profile_stats_replay_views()}</dt>
        <dd>{number(stats.replays_watched)}</dd>
      </div>
    </dl>
  </details>
</section>
