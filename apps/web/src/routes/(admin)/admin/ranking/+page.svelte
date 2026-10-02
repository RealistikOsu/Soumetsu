<script lang="ts">
  import { goto } from '$app/navigation';
  import { suggestions } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import SetCreator from '$lib/components/admin/SetCreator.svelte';

  const suggested = query((signal) => suggestions(signal));

  let link = $state('');

  // A difficulty link ends in its own id, which opens the whole set; otherwise take the first number.
  function idOf(text: string) {
    const difficulty = text.match(/#[a-z]+\/(\d+)/i);
    return (difficulty ?? text.match(/(\d+)/))?.[1];
  }

  function open(event: SubmitEvent) {
    event.preventDefault();
    const id = idOf(link);
    if (id) goto(`/admin/ranking/${id}`);
  }
</script>

<AdminHead heading="Ranking" text="Rank, love or unrank a beatmap set." />

<form class="panel rank-form c-lblue" onsubmit={open}>
  <div class="field">
    <label for="bmapid">Beatmap link or ID</label>
    <div class="inline-save">
      <input
        id="bmapid"
        bind:value={link}
        placeholder="https://osu.ppy.sh/beatmapsets/2448588#osu/5358459"
      />
      <button class="btn btn-blue" type="submit" disabled={!idOf(link)}>Open</button>
    </div>
    <small>A difficulty link opens its whole set.</small>
  </div>
</form>

<SectionTitle colour="c-pink" icon="fa-fire">Most played unranked maps</SectionTitle>
<div class="suggests">
  {#if suggested.state.status === 'ready'}
    {#each suggested.state.data as map (map.beatmapId)}
      <a class="panel suggest" href="/admin/ranking/{map.beatmapId}">
        <span class="suggest-cover" style="background-image:url({map.cover})"></span>
        <b>{map.song}</b>
        <span class="muted">[{map.diff}]<SetCreator setId={map.setId} before=" · " /></span>
        <span class="suggest-foot">
          {#each map.modes as mode (mode)}<img src="/img/modes/mode-{mode}.png" alt="" />{/each}
          <span>{map.difficulties} {map.difficulties === 1 ? 'difficulty' : 'difficulties'}</span>
        </span>
      </a>
    {:else}
      <p class="panel empty-note">Nothing to suggest.</p>
    {/each}
  {:else if suggested.state.status === 'loading'}
    {#each [0, 1, 2, 3] as n (n)}
      <div class="panel"><span class="skel" style="width: 100%; height: 150px"></span></div>
    {/each}
  {:else}
    <p class="panel empty-note">Couldn't load suggestions.</p>
  {/if}
</div>
