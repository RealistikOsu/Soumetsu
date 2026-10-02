<script lang="ts">
  import { mirrorBeatmap } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';

  // The statistics service only gives the beatmap's id, so its name comes from the mirror.
  let { id }: { id: number } = $props();

  const map = query((signal) => mirrorBeatmap(id, signal));
</script>

<a class="map" href="/beatmaps/{id}">
  {#if map.state.status === 'ready'}
    {map.state.data.artist} - {map.state.data.title} [{map.state.data.version}]
  {:else}
    <span class="skel" style="width: 70%"></span>
  {/if}
</a>
