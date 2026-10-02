<script lang="ts">
  import { mirrorSet } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';

  // The mapper's name only comes from the mirror, so it fills in after the list instead of holding it up.
  let {
    setId,
    before = '',
    after = ''
  }: { setId: number; before?: string; after?: string } = $props();

  const set = query((signal) => mirrorSet(setId, signal));
</script>

{#if set.state.status === 'ready' && set.state.data.creator}{before}{set.state.data
    .creator}{after}{/if}
