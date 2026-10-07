<script lang="ts">
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { matchSummary } from '$lib/api/multiplayer';
  import { query } from '$lib/api/query.svelte';
  import MatchHead from '$lib/components/MatchHead.svelte';
  import MatchLeaderboard from '$lib/components/MatchLeaderboard.svelte';
  import MatchMap from '$lib/components/MatchMap.svelte';
  import ModBadges from '$lib/components/ModBadges.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
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
  <MatchHead {match} view="summary" title={m.multiplayer_title()} base="/multiplayer" />

  <main class="wrap rp-page">
    <SectionTitle colour="c-purple" icon="fa-ranking-star">{m.ranked_leaderboard()}</SectionTitle>
    <MatchLeaderboard {participants} />

    <SectionTitle colour="c-blue" icon="fa-music">
      {m.ranked_played_maps()} <small>{number(maps.length)}</small>
    </SectionTitle>
    {#if maps.length}
      <div class="panel score-list c-blue">
        {#each maps as played (played.game)}
          <MatchMap
            beatmap={played.beatmap}
            ruleset={played.mode}
            label={m.multiplayer_game({ number: played.game })}
          >
            <ModBadges bits={played.mods} />
          </MatchMap>
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
