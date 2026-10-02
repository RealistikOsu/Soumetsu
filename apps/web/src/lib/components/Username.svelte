<script lang="ts">
  import { decorationClass } from '$lib/decorations';
  import { decorationStore } from '$lib/decorations.svelte';

  let {
    id,
    name,
    decoration
  }: {
    id: number;
    name: string;
    // Pass this when the decoration is already known, so the batch lookup is skipped.
    decoration?: string | null;
  } = $props();

  $effect(() => {
    if (decoration === undefined) decorationStore.want(id);
  });

  const key = $derived(decoration === undefined ? decorationStore.keys[id] : decoration);
</script>

<b class={decorationClass(key)}>{name}</b>
