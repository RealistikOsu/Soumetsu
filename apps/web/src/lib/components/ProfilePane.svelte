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
    pinned,
    ondetails,
    onpin
  }: {
    id: number;
    mode: number;
    rx: number;
    own: boolean;
    firstPlaces: number;
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

  function pointsOf(rows: { time: number; value: number | null }[]): GraphPoint[] {
    return (
      rows
        .filter((r): r is GraphPoint => r.value !== null && r.value > 0 && !Number.isNaN(r.time))
        .sort((a, b) => a.time - b.time)
        // The history can hold two rows for a day, which would draw a vertical spike.
        .filter((p, i, all) => i === all.length - 1 || all[i + 1].time !== p.time)
    );
  }

  const points = $derived.by(() => {
    if (graph === 'rank' && ranks.state.status === 'ready') {
      return pointsOf(
        ranks.state.data.map((p) => ({ time: Date.parse(p.captured_at), value: p.overall }))
      );
    }
    if (graph === 'pp' && pps.state.status === 'ready') {
      return pointsOf(
        pps.state.data.map((p) => ({ time: Date.parse(p.captured_at), value: p.pp }))
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
  <h2><i class="fa-solid fa-chart-line"></i>Profile graph</h2>
  <nav class="tabs" use:tabInk>
    {#each [['rank', 'Rank'], ['pp', 'PP']] as [key, label] (key)}
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
  <div class="panel c-blue"><p class="empty-note">No graph data found for this user.</p></div>
{:else}
  <div class="panel chart c-blue">
    <span class="skel" style="width: 100%; height: 160px"></span>
  </div>
{/if}

{#if pinned && pinned.length > 0}
  <SectionTitle colour="c-orange" icon="fa-thumbtack">Pinned scores</SectionTitle>
  <div class="panel score-list c-orange">
    {#each pinned as score (score.id)}
      {@render scoreRow(score)}
    {/each}
  </div>
{/if}

<SectionTitle colour="c-yellow" icon="fa-star">Best scores</SectionTitle>
<LoadMoreList
  colour="c-yellow"
  key={(s: ScoreWithBeatmap) => s.id}
  row={scoreRow}
  load={(page, signal) => playerScores('best', id, mode, rx, page, 5, signal)}
/>

<SectionTitle colour="c-green" icon="fa-play">Most played beatmaps</SectionTitle>
<LoadMoreList
  colour="c-green"
  key={(m: MostPlayed) => m.beatmap.beatmap_id}
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
      <div class="score-pp"><b>{number(item.playcount)}</b><span>plays</span></div>
    </div>
  {/snippet}
</LoadMoreList>

<SectionTitle colour="c-lblue" icon="fa-eye">Most watched replays</SectionTitle>
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
  <i class="fa-solid fa-clock-rotate-left"></i>Recent scores
  <label
    ><input
      class="hide-failed"
      type="checkbox"
      bind:checked={hideFailed}
      onchange={() => writeFlag(HIDE_FAILED, hideFailed)}
    /> Hide failed scores</label
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
  First places <small>{number(firstPlaces)}</small>
</SectionTitle>
<LoadMoreList
  colour="c-red"
  key={(s: ScoreWithBeatmap) => s.id}
  row={scoreRow}
  load={(page, signal) => playerScores('firsts', id, mode, rx, page, 5, signal)}
/>
