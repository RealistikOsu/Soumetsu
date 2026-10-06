<script lang="ts">
  import type { MatchSummary } from '$lib/api/rankedPlay';
  import { coverUrl } from '$lib/assets';
  import Avatar from '$lib/components/Avatar.svelte';
  import { dateTime, fromIso, number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let { match }: { match: MatchSummary } = $props();

  const live = $derived(match.status === 'active');
  const covers = $derived(match.cover_set_ids.slice(0, 3));
  const players = $derived(match.players.slice(0, 6));
</script>

<a class="rp-card" class:live href="/ranked-play/{match.id}">
  <div class="rp-covers" aria-hidden="true">
    {#each covers as setId, i (i)}
      <span style="background-image: url({coverUrl(setId, 'list')})"></span>
    {/each}
  </div>
  <div class="rp-card-body">
    <b class="rp-name">{match.name}</b>
    <div class="rp-meta">
      <span>{m.ranked_started({ date: dateTime(fromIso(match.started_at)) })}</span>
      <span>{m.ranked_maps({ count: match.map_count })}</span>
      {#if match.star_min !== null && match.star_max !== null}
        <span>{number(match.star_min, 2)}–{number(match.star_max, 2)}★</span>
      {/if}
    </div>
    <div class="rp-players">
      {#each players as player (player.id)}
        <span title={player.username}><Avatar id={player.id} /></span>
      {/each}
      {#if match.players.length > players.length}
        <small>+{match.players.length - players.length}</small>
      {/if}
    </div>
  </div>
  <span class="rp-state" class:live>
    {#if live}{m.ranked_in_progress()}{:else}{m.ranked_ended()}{/if}
  </span>
</a>
