<script lang="ts">
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { matchEvents } from '$lib/api/multiplayer';
  import { query } from '$lib/api/query.svelte';
  import MatchGame from '$lib/components/MatchGame.svelte';
  import MatchHead from '$lib/components/MatchHead.svelte';
  import MatchNote from '$lib/components/MatchNote.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { m } from '$lib/paraglide/messages';

  const id = $derived(Number(page.params.id));
  const history = query((signal) => matchEvents(id, signal));
  const result = $derived(history.state);
</script>

{#if result.status === 'error' && isApiError(result.error) && result.error.status === 404}
  <NotFound />
{:else if result.status === 'ready'}
  {@const { match, events } = result.data}
  <MatchHead {match} view="history" title={m.multiplayer_title()} base="/multiplayer" />

  <main class="wrap rp-page">
    {#if events.length}
      <ol class="rp-timeline">
        {#each events as event, i (i)}
          {#if event.type === 'game'}
            <li class="rp-event rp-round">
              <span class="rp-dot c-purple"><i class="fa-solid fa-music"></i></span>
              <div class="panel c-purple"><MatchGame game={event.game} /></div>
            </li>
          {:else}
            <MatchNote {event} />
          {/if}
        {/each}
      </ol>
    {:else}
      <div class="panel c-purple"><p class="empty-note">{m.common_nothing_here()}</p></div>
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
