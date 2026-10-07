<script lang="ts">
  import type { Participant } from '$lib/api/rankedPlay';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let { participants, winnerId = null }: { participants: Participant[]; winnerId?: number | null } =
    $props();
</script>

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
            <Avatar id={row.user.id} /><Flag country={row.user.country} /><b>{row.user.username}</b>
            {#if winnerId === row.user.id}
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
