<script lang="ts">
  import type { PlaylistSummary } from '$lib/api/rooms';
  import { coverUrl } from '$lib/assets';
  import { dateTime, fromIso, number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let { room }: { room: PlaylistSummary } = $props();

  const live = $derived(room.ended_at === null);
</script>

<a class="rp-card" class:live href="/playlists/{room.id}">
  <div class="rp-covers" aria-hidden="true">
    {#if room.first_beatmap}
      <span style="background-image: url({coverUrl(room.first_beatmap.set_id, 'list')})"></span>
    {/if}
  </div>
  <div class="rp-card-body">
    <b class="rp-name">{room.name}</b>
    <div class="rp-meta">
      {#if room.host}<span>{m.rooms_by({ name: room.host.username })}</span>{/if}
      <span>{m.rooms_created({ date: dateTime(fromIso(room.created_at)) })}</span>
      {#if room.ended_at}
        <span>{m.rooms_finished({ date: dateTime(fromIso(room.ended_at)) })}</span>
      {:else if room.ends_at}
        <span>{m.rooms_ends({ date: dateTime(fromIso(room.ends_at)) })}</span>
      {/if}
    </div>
    <div class="rp-meta">
      <span>{m.rooms_items({ count: room.item_count })}</span>
      <span>{m.rooms_participants({ count: room.participants })}</span>
      {#if room.star_min !== null && room.star_max !== null}
        <span>{number(room.star_min, 2)}–{number(room.star_max, 2)}★</span>
      {/if}
    </div>
  </div>
  <span class="rp-state" class:live>
    {#if live}{m.rooms_active()}{:else}{m.rooms_ended()}{/if}
  </span>
</a>
