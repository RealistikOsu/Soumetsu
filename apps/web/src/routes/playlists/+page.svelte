<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { tabInk } from '@soumetsu/ui';
  import { query } from '$lib/api/query.svelte';
  import { PLAYLISTS_PAGE_SIZE, playlists, type PlaylistStatus } from '$lib/api/rooms';
  import Banner from '$lib/components/Banner.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import RoomCard from '$lib/components/RoomCard.svelte';
  import { m } from '$lib/paraglide/messages';

  const status = $derived<PlaylistStatus>(
    page.url.searchParams.get('status') === 'ended' ? 'ended' : 'active'
  );
  const current = $derived(Math.max(1, parseInt(page.url.searchParams.get('p') ?? '') || 1));

  const list = query((signal) => playlists(status, current, signal));
  const result = $derived(list.state);
</script>

<svelte:head><title>{m.rooms_playlists_title()} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg"><h1>{m.rooms_playlists_title()}</h1></Banner>

<main class="wrap rp-page">
  <nav class="tabs tinted room-tabs" use:tabInk>
    <a class="c-green" class:active={status === 'active'} href="?status=active">
      {m.rooms_active()}
    </a>
    <a class="c-purple" class:active={status === 'ended'} href="?status=ended">
      {m.rooms_ended()}
    </a>
  </nav>

  {#if result.status === 'ready'}
    {@const { total, rooms } = result.data}
    {#if rooms.length}
      <div class="rp-list">
        {#each rooms as room (room.id)}<RoomCard {room} />{/each}
      </div>
      <Pager
        page={current}
        hasNext={current * PLAYLISTS_PAGE_SIZE < total}
        pages={Math.max(1, Math.ceil(total / PLAYLISTS_PAGE_SIZE))}
        onpage={(p) => goto(`?status=${status}&p=${p}`, { keepFocus: true })}
      />
    {:else}
      <div class="panel">
        <p class="empty-note">
          {status === 'active' ? m.rooms_active_empty() : m.rooms_ended_empty()}
        </p>
      </div>
    {/if}
  {:else if result.status === 'error'}
    <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
  {/if}
</main>
