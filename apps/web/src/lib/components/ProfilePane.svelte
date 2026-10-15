<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ms } from '$lib/motion';
  import { readFlag, writeFlag } from '$lib/preferences';
  import {
    playerScores,
    watchedScores,
    type ScoreWithBeatmap,
    type WatchedScore
  } from '$lib/api/scores';
  import { isLazer } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';
  import ListPicker from './ListPicker.svelte';
  import LoadMoreList from './LoadMoreList.svelte';
  import ScoreRow from './ScoreRow.svelte';
  import SectionTitle from './SectionTitle.svelte';

  let {
    id,
    mode,
    rx,
    own,
    pinned,
    onpin
  }: {
    id: number;
    mode: number;
    rx: number;
    own: boolean;
    pinned: ScoreWithBeatmap[] | null;
    onpin: (score: ScoreWithBeatmap) => void;
  } = $props();

  type List = 'best' | 'recent' | 'firsts' | 'watched';

  // Lazer has no first places or replays here.
  const lists = $derived(
    [
      { key: 'best', label: m.profile_section_best(), icon: 'fa-star', colour: 'c-yellow' },
      {
        key: 'recent',
        label: m.profile_section_recent(),
        icon: 'fa-clock-rotate-left',
        colour: 'c-blue'
      },
      {
        key: 'firsts',
        label: m.profile_section_first_places(),
        icon: 'fa-trophy',
        colour: 'c-red'
      },
      { key: 'watched', label: m.profile_section_most_watched(), icon: 'fa-eye', colour: 'c-lblue' }
    ].filter((list) => !isLazer(rx) || list.key === 'best' || list.key === 'recent') as {
      key: List;
      label: string;
      icon: string;
      colour: string;
    }[]
  );

  let list = $state<List>('best');
  // A list is only fetched once it's been opened, then kept so switching back is instant.
  let opened = $state.raw<List[]>(['best']);

  const HIDE_FAILED = 'soumetsu.hide-failed';
  let hideFailed = $state(readFlag(HIDE_FAILED));

  const pinnedIds = $derived(new Set((pinned ?? []).map((s) => s.id)));
  let pinnedShown = $state(5);
</script>

{#snippet scoreRow(score: ScoreWithBeatmap)}
  <ScoreRow {score} {own} {rx} pinned={pinnedIds.has(score.id)} onpin={() => onpin(score)} />
{/snippet}

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

<ListPicker
  items={lists}
  value={list}
  onselect={(key) => {
    list = key;
    if (!opened.includes(key)) opened = [...opened, key];
  }}
>
  {#snippet extra()}
    {#if list === 'recent'}
      <label class="switch">
        <input
          type="checkbox"
          bind:checked={hideFailed}
          onchange={() => writeFlag(HIDE_FAILED, hideFailed)}
        /><span></span>{m.profile_section_hide_failed()}
      </label>
    {/if}
  {/snippet}
</ListPicker>

{#each opened as shown (shown)}
  <div class="score-lists" data-pane="list-{shown}" hidden={shown !== list}>
    {#if shown === 'best'}
      <LoadMoreList
        colour="c-yellow"
        key={(s: ScoreWithBeatmap) => s.id}
        row={scoreRow}
        load={(page, signal) => playerScores('best', id, mode, rx, page, 5, signal)}
      />
    {:else if shown === 'recent'}
      {#key hideFailed}
        <div in:fade={{ duration: ms(180), delay: ms(120) }} out:fade={{ duration: ms(120) }}>
          <LoadMoreList
            colour="c-blue"
            key={(s: ScoreWithBeatmap) => s.id}
            row={scoreRow}
            load={(page, signal) =>
              playerScores('recent', id, mode, rx, page, 5, signal, hideFailed)}
          />
        </div>
      {/key}
    {:else if shown === 'firsts'}
      <LoadMoreList
        colour="c-red"
        key={(s: ScoreWithBeatmap) => s.id}
        row={scoreRow}
        load={(page, signal) => playerScores('firsts', id, mode, rx, page, 5, signal)}
      />
    {:else}
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
            onpin={() => onpin(score)}
          />
        {/snippet}
      </LoadMoreList>
    {/if}
  </div>
{/each}
