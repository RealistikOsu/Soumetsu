<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { MATCHES_PAGE_SIZE, userMatches } from '$lib/api/rankedPlay';
  import { profile } from '$lib/api/users';
  import Banner from '$lib/components/Banner.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import RankedMatchCard from '$lib/components/RankedMatchCard.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const id = $derived(Number(page.params.id));
  const current = $derived(Math.max(1, parseInt(page.url.searchParams.get('p') ?? '') || 1));

  const owner = query((signal) => profile(id, 0, 0, signal));
  const matches = query((signal) => userMatches(id, current, signal));
  const result = $derived(matches.state);
  const username = $derived(owner.state.status === 'ready' ? owner.state.data.username : '');
</script>

<svelte:head>
  <title>{m.ranked_title()} · {username} · RealistikOsu</title>
</svelte:head>

{#if result.status === 'error' && isApiError(result.error) && result.error.status === 404}
  <NotFound user />
{:else}
  <Banner image="leaderboard.jpg">
    <div>
      <h1>{m.ranked_title()}</h1>
      <p class="sub"><a href="/users/{id}">{username}</a></p>
    </div>
  </Banner>

  <main class="wrap rp-page">
    {#if result.status === 'ready'}
      {@const { active, ended, total_ended } = result.data}
      {#if current === 1}
        <SectionTitle colour="c-green" icon="fa-circle-play">
          {m.ranked_active()} <small>{number(active.length)}</small>
        </SectionTitle>
        {#if active.length}
          <div class="rp-list">
            {#each active as match (match.id)}<RankedMatchCard {match} />{/each}
          </div>
        {:else}
          <div class="panel c-green"><p class="empty-note">{m.ranked_active_empty()}</p></div>
        {/if}
      {/if}

      <SectionTitle colour="c-purple" icon="fa-flag-checkered">
        {m.ranked_ended()} <small>{number(total_ended)}</small>
      </SectionTitle>
      {#if ended.length}
        <div class="rp-list">
          {#each ended as match (match.id)}<RankedMatchCard {match} />{/each}
        </div>
        <Pager
          page={current}
          hasNext={current * MATCHES_PAGE_SIZE < total_ended}
          pages={Math.max(1, Math.ceil(total_ended / MATCHES_PAGE_SIZE))}
          onpage={(p) => goto(`?p=${p}`, { keepFocus: true })}
        />
      {:else}
        <div class="panel c-purple"><p class="empty-note">{m.ranked_ended_empty()}</p></div>
      {/if}
    {:else if result.status === 'error'}
      <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
    {:else}
      <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
    {/if}
  </main>
{/if}
