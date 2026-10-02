<script lang="ts">
  import type { Snippet } from 'svelte';

  let { colour, children }: { colour: string; children: Snippet } = $props();
</script>

<span class="admin-tag {colour}">{@render children()}</span>
