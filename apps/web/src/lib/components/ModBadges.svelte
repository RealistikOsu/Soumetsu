<script lang="ts">
  import { modAcronyms } from '$lib/mods';

  let { bits }: { bits: number } = $props();
</script>

{#each modAcronyms(bits) as acronym (acronym)}<span class="rp-mod">{acronym}</span>{/each}
