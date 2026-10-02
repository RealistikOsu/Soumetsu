<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  let { children }: { children: Snippet } = $props();

  // Pages in this group need a logged-in user, and send everyone else to log in first.
  $effect(() => {
    if (!session.ready || session.user) return;
    flash.next('warning', m.common_login_required());
    goto(`/login?redir=${encodeURIComponent(page.url.pathname + page.url.search)}`, {
      replaceState: true
    });
  });
</script>

{#if session.user}{@render children()}{/if}
