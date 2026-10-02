<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { mirrorSet } from '$lib/api/mirror';
  import NotFound from '$lib/components/NotFound.svelte';

  let missing = $state(false);

  // A set opens on its first difficulty, as on Hanayo.
  $effect(() => {
    missing = false;
    mirrorSet(Number(page.params.id)).then(
      (set) => {
        const first = set.beatmaps.toSorted((a, b) => a.difficulty_rating - b.difficulty_rating)[0];
        if (first) goto(`/beatmaps/${first.id}`, { replaceState: true });
        else missing = true;
      },
      () => (missing = true)
    );
  });
</script>

{#if missing}<NotFound />{/if}
