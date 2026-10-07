<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import type { MatchBase } from '$lib/api/rankedPlay';
  import { coverUrl } from '$lib/assets';
  import Banner from '$lib/components/Banner.svelte';
  import { dateTime, fromIso } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let {
    match,
    view,
    title,
    base
  }: { match: MatchBase; view: 'summary' | 'history'; title: string; base: string } = $props();

  const live = $derived(match.status === 'active');
  const cover = $derived(
    match.cover_set_ids.length
      ? coverUrl(match.cover_set_ids[0], 'cover')
      : '/img/headers/leaderboard.jpg'
  );
</script>

<svelte:head><title>{match.name} · {title} · RealistikOsu</title></svelte:head>

<Banner url={cover} class="rp-banner">
  <div class="rp-head">
    <span class="rp-state" class:live>
      {#if live}{m.ranked_in_progress()}{:else}{m.ranked_ended()}{/if}
    </span>
    <h1>{match.name}</h1>
    <p class="sub">
      {m.ranked_started({ date: dateTime(fromIso(match.started_at)) })}
      {#if match.ended_at}
        · {m.ranked_finished({ date: dateTime(fromIso(match.ended_at)) })}
      {/if}
      · {m.ranked_maps({ count: match.map_count })}
      · {m.ranked_players({ count: match.players.length })}
    </p>
  </div>
  <nav class="tabs rp-switch" use:tabInk>
    <a class:active={view === 'summary'} href="{base}/{match.id}">
      <i class="fa-solid fa-list-ol"></i>{m.ranked_view_summary()}
    </a>
    <a class:active={view === 'history'} href="{base}/{match.id}/history">
      <i class="fa-solid fa-clock-rotate-left"></i>{m.ranked_view_history()}
    </a>
  </nav>
</Banner>
