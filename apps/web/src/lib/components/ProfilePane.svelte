<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ms } from '$lib/motion';
  import { readFlag, writeFlag } from '$lib/preferences';
  import { mostPlayed, ppHistory, rankHistory, type MostPlayed } from '$lib/api/users';
  import { query } from '$lib/api/query.svelte';
  import {
    playerScores,
    watchedScores,
    type ScoreWithBeatmap,
    type WatchedScore
  } from '$lib/api/scores';
  import { coverUrl } from '$lib/assets';
  import type { GraphPoint } from '$lib/graph';
  import { songParts, number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';
  import { tabInk } from '@soumetsu/ui';
  import LoadMoreList from './LoadMoreList.svelte';
  import ProfileGraph from './ProfileGraph.svelte';
  import ScoreRow from './ScoreRow.svelte';
  import SectionTitle from './SectionTitle.svelte';

  let {
    id,
    mode,
    rx,
    own,
    firstPlaces,
    current,
    pinned,
    ondetails,
    onpin
  }: {
    id: number;
    mode: number;
    rx: number;
    own: boolean;
    firstPlaces: number;
    // Today's rank and pp, so the graph ends where the profile says they are now.
    current: { rank: number; pp: number };
    pinned: ScoreWithBeatmap[] | null;
    ondetails: (score: ScoreWithBeatmap) => void;
    onpin: (score: ScoreWithBeatmap) => void;
  } = $props();

  let graph = $state<'rank' | 'pp'>('rank');
  const HIDE_FAILED = 'soumetsu.hide-failed';
  let hideFailed = $state(readFlag(HIDE_FAILED));

  const ranks = query((signal) => rankHistory(id, mode, rx, signal));
  const pps = query((signal) => ppHistory(id, mode, rx, signal));

  const pinnedIds = $derived(new Set((pinned ?? []).map((s) => s.id)));
  let pinnedShown = $state(5);

  // The history is captured once a day, so today's figure is added as the last point.
  function pointsOf(rows: { time: number; value: number | null }[], now: number): GraphPoint[] {
    return (
      [...rows, { time: Date.now(), value: now }]
        .filter((r): r is GraphPoint => r.value !== null && r.value > 0 && !Number.isNaN(r.time))
        .sort((a, b) => a.time - b.time)
        // The history can hold two rows for a day, which would draw a vertical spike.
        .filter((p, i, all) => i === all.length - 1 || all[i + 1].time !== p.time)
    );
  }

  const points = $derived.by(() => {
    if (graph === 'rank' && ranks.state.status === 'ready') {
      return pointsOf(
        ranks.state.data.map((p) => ({ time: Date.parse(p.captured_at), value: p.overall })),
        current.rank
      );
    }
    if (graph === 'pp' && pps.state.status === 'ready') {
      return pointsOf(
        pps.state.data.map((p) => ({ time: Date.parse(p.captured_at), value: p.pp })),
        current.pp
      );
    }
    return null;
  });
</script>

{#snippet scoreRow(score: ScoreWithBeatmap)}
  <ScoreRow
    {score}
    {own}
    pinned={pinnedIds.has(score.id)}
    ondetails={() => ondetails(score)}
    onpin={() => onpin(score)}
  />
{/snippet}

<div class="section-title chart-head c-blue">
  <h2><i class="fa-solid fa-chart-line"></i>{m.profile_graph_title()}</h2>
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
</div>
{#if points && points.length > 1}
  {#key graph}
    <ProfileGraph {points} inverted={graph === 'rank'} unit={graph === 'pp' ? 'pp' : ''} />
  {/key}
{:else if points}
  <div class="panel c-blue"><p class="empty-note">{m.profile_graph_empty()}</p></div>
{:else}
  <div class="panel chart c-blue">
    <span class="skel" style="width: 100%; height: 160px"></span>
  </div>
{/if}

{#if pinned && pinned.length > 0}
  <SectionTitle colour="c-orange" icon="fa-thumbtack">{m.profile_section_pinned()}</SectionTitle>
  <div class="panel score-list c-orange">
    {#each pinned.slice(0, pinnedShown) as score (score.id)}
      {@render scoreRow(score)}
    {/each}
    {#if pinned.length > pinnedShown}
      <a
        class="more"
        href="#more"
        onclick={(event) => {
          event.preventDefault();
          pinnedShown += 5;
        }}
      >
        {m.profile_pinned_more()}
      </a>
    {/if}
  </div>
{/if}

<SectionTitle colour="c-yellow" icon="fa-star">{m.profile_section_best()}</SectionTitle>
<LoadMoreList
  colour="c-yellow"
  key={(s: ScoreWithBeatmap) => s.id}
  row={scoreRow}
  load={(page, signal) => playerScores('best', id, mode, rx, page, 5, signal)}
/>

<SectionTitle colour="c-green" icon="fa-play">{m.profile_section_most_played()}</SectionTitle>
<LoadMoreList
  colour="c-green"
  key={(item: MostPlayed) => item.beatmap.beatmap_id}
  load={(page, signal) => mostPlayed(id, mode, rx, page, 5, signal)}
>
  {#snippet row(item: MostPlayed)}
    {@const parts = songParts(item.beatmap.song_name)}
    <div
      class="score-row played"
      style="--cover: url({coverUrl(item.beatmap.beatmapset_id, 'card')})"
    >
      <div class="score-bg"></div>
      <div class="score-info">
        <a class="song" href="/beatmaps/{item.beatmap.beatmap_id}">{parts.song}</a>
        <div class="score-meta">{parts.diff}</div>
      </div>
      <div class="score-pp">
        <b>{number(item.playcount)}</b><span
          >{m.profile_most_played_plays({ count: item.playcount })}</span
        >
      </div>
    </div>
  {/snippet}
</LoadMoreList>

<SectionTitle colour="c-lblue" icon="fa-eye">{m.profile_section_most_watched()}</SectionTitle>
<LoadMoreList
  colour="c-lblue"
  key={(s: WatchedScore) => s.id}
  load={(page, signal) => watchedScores(id, mode, rx, page, 5, signal)}
>
  {#snippet row(score: WatchedScore)}
    <ScoreRow
      {score}
      {own}
      pinned={pinnedIds.has(score.id)}
      watched={score.watched_count}
      ondetails={() => ondetails(score)}
      onpin={() => onpin(score)}
    />
  {/snippet}
</LoadMoreList>

<h2 class="section-title c-blue">
  <i class="fa-solid fa-clock-rotate-left"></i>{m.profile_section_recent()}
  <label
    ><input
      class="hide-failed"
      type="checkbox"
      bind:checked={hideFailed}
      onchange={() => writeFlag(HIDE_FAILED, hideFailed)}
    />
    {m.profile_section_hide_failed()}</label
  >
</h2>
{#key hideFailed}
  <div in:fade={{ duration: ms(180), delay: ms(120) }} out:fade={{ duration: ms(120) }}>
    <LoadMoreList
      colour="c-blue"
      key={(s: ScoreWithBeatmap) => s.id}
      row={scoreRow}
      load={(page, signal) => playerScores('recent', id, mode, rx, page, 5, signal, hideFailed)}
    />
  </div>
{/key}

<SectionTitle colour="c-red" icon="fa-trophy">
  {m.profile_section_first_places()} <small>{number(firstPlaces)}</small>
</SectionTitle>
<LoadMoreList
  colour="c-red"
  key={(s: ScoreWithBeatmap) => s.id}
  row={scoreRow}
  load={(page, signal) => playerScores('firsts', id, mode, rx, page, 5, signal)}
/>
