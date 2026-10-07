<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { playlist, playlistScores } from '$lib/api/rooms';
  import Banner from '$lib/components/Banner.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import RankedMap from '$lib/components/RankedMap.svelte';
  import RoomBoard from '$lib/components/RoomBoard.svelte';
  import RoomMods from '$lib/components/RoomMods.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { coverUrl } from '$lib/assets';
  import { dateTime, fromIso, number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const id = $derived(Number(page.params.id));
  const current = $derived(Math.max(1, parseInt(page.url.searchParams.get('p') ?? '') || 1));

  const detail = query((signal) => playlist(id, signal));
  const result = $derived(detail.state);
  const title = $derived(result.status === 'ready' ? `${result.data.room.name} · ` : '');
</script>

<svelte:head><title>{title}{m.rooms_playlists_title()} · RealistikOsu</title></svelte:head>

{#if result.status === 'error' && isApiError(result.error) && result.error.status === 404}
  <NotFound />
{:else if result.status === 'ready'}
  {@const { room, items } = result.data}
  {@const live = room.ended_at === null}
  {@const item =
    items.find((it) => it.item_id === Number(page.url.searchParams.get('item'))) ?? items[0]}
  <Banner
    class="rp-banner"
    url={room.first_beatmap
      ? coverUrl(room.first_beatmap.set_id, 'cover')
      : '/img/headers/leaderboard.jpg'}
  >
    <div class="rp-head">
      <span class="rp-state" class:live>
        {#if live}{m.rooms_active()}{:else}{m.rooms_ended()}{/if}
      </span>
      <h1>{room.name}</h1>
      <p class="sub">
        {#if room.host}<a href="/users/{room.host.id}">{room.host.username}</a> ·{/if}
        {m.rooms_created({ date: dateTime(fromIso(room.created_at)) })}
        {#if room.ended_at}
          · {m.rooms_finished({ date: dateTime(fromIso(room.ended_at)) })}
        {:else if room.ends_at}
          · {m.rooms_ends({ date: dateTime(fromIso(room.ends_at)) })}
        {/if}
        · {m.rooms_participants({ count: room.participants })}
      </p>
    </div>
  </Banner>

  <main class="wrap rp-page">
    <SectionTitle colour="c-blue" icon="fa-music">
      {m.rooms_maps()} <small>{number(items.length)}</small>
    </SectionTitle>
    {#if items.length}
      <div class="panel score-list c-blue">
        {#each items as it (it.item_id)}
          <RankedMap
            beatmap={it.beatmap}
            ruleset={it.ruleset}
            class="room-item {it.item_id === item.item_id ? 'picked' : ''}"
          >
            <RoomMods required={it.required_mods} allowed={it.allowed_mods} />
            {#if it.expired}<span class="room-allowed">{m.rooms_expired()}</span>{/if}
            <span class="room-allowed">{m.rooms_participants({ count: it.participants })}</span>
            <a class="room-pick" href="?item={it.item_id}">
              {it.item_id === item.item_id ? m.rooms_shown() : m.rooms_show_scores()}
            </a>
          </RankedMap>
        {/each}
      </div>

      <SectionTitle colour="c-purple" icon="fa-ranking-star">{m.rooms_leaderboard()}</SectionTitle>
      {#key item.item_id}
        <RoomBoard
          load={(p, signal) => playlistScores(id, item.item_id, p, signal)}
          page={current}
          onpage={(p) => goto(`?item=${item.item_id}&p=${p}`, { keepFocus: true, noScroll: true })}
        />
      {/key}
    {:else}
      <div class="panel c-blue"><p class="empty-note">{m.rooms_no_maps()}</p></div>
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
