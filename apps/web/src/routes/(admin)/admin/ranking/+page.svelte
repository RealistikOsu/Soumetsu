<script lang="ts">
  import { goto } from '$app/navigation';
  import { suggestions } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import SetCreator from '$lib/components/admin/SetCreator.svelte';
  import { mapRef } from '$lib/mapLinks';

  const suggested = query((signal) => suggestions(signal));

  let link = $state('');

  // A difficulty opens its whole set. A bare number is tried as a difficulty first, then as a set.
  function open(event: SubmitEvent) {
    event.preventDefault();
    const ref = mapRef(link);
    if (ref?.beatmap) goto(`/admin/ranking/${ref.beatmap}`);
    else if (ref?.set) goto(`/admin/ranking/${ref.set}?set`);
  }
</script>

<AdminHead heading="Ranking" text="Rank, love or unrank a beatmap set." />

<form class="link-form" onsubmit={open}>
  <label for="bmapid">Beatmap or set link, or ID</label>
  <div class="framed-input">
    <i class="fa-solid fa-link"></i>
    <input
      id="bmapid"
      bind:value={link}
      placeholder="https://osu.ppy.sh/beatmapsets/2448588#osu/5358459"
      autocomplete="off"
    />
    <button class="btn btn-blue" type="submit" disabled={!mapRef(link)}>Open set</button>
  </div>
  <small>A difficulty link opens its whole set.</small>
</form>

<h2 class="day-label suggest-label">Most played unranked maps</h2>
<div class="map-tiles">
  {#if suggested.state.status === 'ready'}
    {#each suggested.state.data as map (map.beatmapId)}
      <a class="map-tile" href="/admin/ranking/{map.beatmapId}" style="--cover: url({map.cover})">
        <b>{map.song}</b>
        <span>[{map.diff}]<SetCreator setId={map.setId} before=" · " /></span>
        <span class="row">
          <span class="mode-icons">
            {#each map.modes as mode (mode)}<img src="/img/modes/mode-{mode}.png" alt="" />{/each}
          </span>
          {map.difficulties}
          {map.difficulties === 1 ? 'difficulty' : 'difficulties'}
        </span>
      </a>
    {:else}
      <p class="panel empty-note">Nothing to suggest.</p>
    {/each}
  {:else if suggested.state.status === 'loading'}
    {#each [0, 1, 2, 3] as n (n)}
      <span class="skel" style="width: 100%; height: 150px"></span>
    {/each}
  {:else}
    <p class="panel empty-note">Couldn't load suggestions.</p>
  {/if}
</div>
