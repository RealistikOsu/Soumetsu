<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ms } from '$lib/motion';
  import { readFlag, writeFlag } from '$lib/preferences';
  import { mostPlayed, profileSets, type MostPlayed, type ProfileSet } from '$lib/api/users';
  import { profileHistory, type ProfileHistory } from '$lib/api/v1';
  import { query } from '$lib/api/query.svelte';
  import {
    playerScores,
    watchedScores,
    type ScoreWithBeatmap,
    type WatchedScore
  } from '$lib/api/scores';
  import { coverUrl } from '$lib/assets';
  import { statusOf } from '$lib/beatmaps';
  import type { GraphPoint } from '$lib/graph';
  import { songParts, number, timeAgo } from '$lib/format';
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
    rankedSets,
    mappedSets,
    rankHistory,
    pinned,
    ondetails,
    onpin
  }: {
    id: number;
    mode: number;
    rx: number;
    own: boolean;
    firstPlaces: number;
    rankedSets: number;
    mappedSets: number;
    // Loaded by the profile, which also shows it in the peak rank card; undefined while loading.
    rankHistory: ProfileHistory | undefined;
    pinned: ScoreWithBeatmap[] | null;
    ondetails: (score: ScoreWithBeatmap) => void;
    onpin: (score: ScoreWithBeatmap) => void;
  } = $props();

  let graph = $state<'rank' | 'pp'>('rank');
  const HIDE_FAILED = 'soumetsu.hide-failed';
  let hideFailed = $state(readFlag(HIDE_FAILED));

  const pps = query((signal) => profileHistory('pp', id, mode, rx, signal));

  const pinnedIds = $derived(new Set((pinned ?? []).map((s) => s.id)));
  let pinnedShown = $state(5);

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
{:else if history.status === 'ready' && history.data.status === 'inactive'}
  <div class="panel c-blue"><p class="empty-note">{m.profile_graph_inactive()}</p></div>
{:else if history.status !== 'loading'}
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

{#snippet setRow(set: ProfileSet)}
  {@const status = statusOf(set.status)}
  <div class="score-row played" style="--cover: url({coverUrl(set.beatmapset_id, 'card')})">
    <div class="score-bg"></div>
    <div class="score-info">
      <a class="song" href="/beatmaps/{set.beatmap_id}">{set.title}</a>
      <div class="score-meta">
        {m.profile_sets_difficulties({ count: set.difficulties })}
        {#if set.time}· {timeAgo(set.time)}{/if}
      </div>
    </div>
    <span class="map-status {status.colour}"
      ><i class="fa-solid {status.icon}"></i>{status.name}</span
    >
  </div>
{/snippet}

{#if rankedSets > 0}
  <SectionTitle colour="c-pink" icon="fa-angles-up">
    {m.profile_section_ranked_sets()} <small>{number(rankedSets)}</small>
  </SectionTitle>
  <LoadMoreList
    colour="c-pink"
    key={(set: ProfileSet) => set.beatmapset_id}
    row={setRow}
    load={(page, signal) => profileSets('ranked', id, page, 5, signal)}
  />
{/if}

{#if mappedSets > 0}
  <SectionTitle colour="c-purple" icon="fa-pen-ruler">
    {m.profile_section_mapped_sets()} <small>{number(mappedSets)}</small>
  </SectionTitle>
  <LoadMoreList
    colour="c-purple"
    key={(set: ProfileSet) => set.beatmapset_id}
    row={setRow}
    load={(page, signal) => profileSets('mapped', id, page, 5, signal)}
  />
{/if}

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
