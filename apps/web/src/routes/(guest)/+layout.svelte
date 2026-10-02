<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { session } from '$lib/auth/session.svelte';

  let { children }: { children: Snippet } = $props();

  // Only visitors who arrive logged out have any use for these pages. Logging in from one of them is
  // handled by that page, so this checks once.
  let checked = false;
  $effect(() => {
    if (!session.ready || checked) return;
    checked = true;
    if (session.user) goto('/', { replaceState: true });
  });
</script>

{@render children()}
