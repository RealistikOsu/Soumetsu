<script lang="ts">
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { matchSummary } from '$lib/api/rankedPlay';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import RankedMap from '$lib/components/RankedMap.svelte';
  import RankedMatchHead from '$lib/components/RankedMatchHead.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const id = $derived(Number(page.params.id));
  const summary = query((signal) => matchSummary(id, signal));
  const result = $derived(summary.state);
</script>

{#if result.status === 'error' && isApiError(result.error) && result.error.status === 404}
  <NotFound />
{:else if result.status === 'ready'}
  {@const { match, participants, maps } = result.data}
  <RankedMatchHead {match} view="summary" />

  <main class="wrap rp-page">
    <SectionTitle colour="c-purple" icon="fa-ranking-star">{m.ranked_leaderboard()}</SectionTitle>
    <table class="board c-purple">
      <thead>
        <tr>
          <th class="rank">{m.leaderboard_col_rank()}</th>
          <th class="player">{m.leaderboard_col_player()}</th>
          <th>{m.leaderboard_col_accuracy()}</th>
          <th class="hide-sm">{m.leaderboard_col_playcount()}</th>
          <th>{m.ranked_col_score()}</th>
        </tr>
      </thead>
      <tbody>
        {#each participants as row (row.user.id)}
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
                {#if match.winner_id === row.user.id}
                  <i class="fa-solid fa-crown rp-winner" title={m.ranked_winner()}></i>
                {/if}
              </a>
            </td>
            <td>{number(row.accuracy, 2)}%</td>
            <td class="dim hide-sm">{number(row.play_count)}</td>
            <td class="pp">{number(row.total_score)}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    <SectionTitle colour="c-blue" icon="fa-music">
      {m.ranked_played_maps()} <small>{number(maps.length)}</small>
    </SectionTitle>
    {#if maps.length}
      <div class="panel score-list c-blue">
        {#each maps as played (played.round)}
          <RankedMap beatmap={played.beatmap} ruleset={played.ruleset} round={played.round} />
        {/each}
      </div>
    {:else}
      <div class="panel c-blue"><p class="empty-note">{m.ranked_no_maps()}</p></div>
    {/if}
  </main>
{:else if result.status === 'error'}
  <main class="wrap rp-page">
    <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
  </main>
{:else}
  <main class="wrap rp-page">
    <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
  </main>
{/if}
