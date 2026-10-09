<script lang="ts">
  import { query } from '$lib/api/query.svelte';
  import { SCORES_PAGE_SIZE, type RoomScores } from '$lib/api/rooms';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { number } from '$lib/format';
  import { modsText } from '$lib/mods';
  import { gradeClass, gradeFromRank, gradeLabel } from '$lib/grades';
  import { m } from '$lib/paraglide/messages';

  let {
    load,
    page,
    onpage,
    empty,
    pending = false
  }: {
    load: (page: number, signal: AbortSignal) => Promise<RoomScores>;
    page: number;
    onpage: (page: number) => void;
    empty?: string;
    // The scores load early, but stay behind the skeleton until the caller knows the board is real.
    pending?: boolean;
  } = $props();

  const scores = query((signal) => load(page, signal));
  const result = $derived(scores.state);
</script>

{#if !pending && result.status === 'ready'}
  {@const { total, scores: rows } = result.data}
  {@const withMods = rows.some((row) => modsText(row.mods))}
  {#if rows.length}
    <table class="board c-purple">
      <thead>
        <tr>
          <th class="rank">{m.leaderboard_col_rank()}</th>
          <th class="player">{m.leaderboard_col_player()}</th>
          {#if withMods}<th>{m.rooms_col_mods()}</th>{/if}
          <th class="hide-sm">{m.rooms_col_combo()}</th>
          <th>{m.leaderboard_col_accuracy()}</th>
          <th class="hide-sm">{m.leaderboard_col_playcount()}</th>
          <th>{m.rooms_col_score()}</th>
          <th>{m.rooms_col_grade()}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.user.id)}
          {@const grade = gradeFromRank(row.grade)}
          <tr
            class:place-1={row.rank === 1}
            class:place-2={row.rank === 2}
            class:place-3={row.rank === 3}
          >
            <td class="rank">#{row.rank}</td>
            <td class="player">
              <a href="/users/{row.user.id}">
                <Avatar id={row.user.id} /><Flag country={row.user.country} /><b
                  >{row.user.username}</b
                >
              </a>
            </td>
            {#if withMods}<td class="dim">{modsText(row.mods)}</td>{/if}
            <td class="dim hide-sm">{number(row.max_combo)}x</td>
            <td>{number(row.accuracy, 2)}%</td>
            <td class="dim hide-sm">{number(row.play_count)}</td>
            <td class="pp">{number(row.total_score)}</td>
            <td><span class="grade grade-{gradeClass[grade]}">{gradeLabel(grade)}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
    <Pager
      {page}
      hasNext={page * SCORES_PAGE_SIZE < total}
      pages={Math.max(1, Math.ceil(total / SCORES_PAGE_SIZE))}
      {onpage}
    />
  {:else}
    <div class="panel c-purple"><p class="empty-note">{empty ?? m.rooms_scores_empty()}</p></div>
  {/if}
{:else if !pending && result.status === 'error'}
  <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
{:else}
  <div class="panel"><span class="skel" style="width: 100%; height: 320px"></span></div>
{/if}
