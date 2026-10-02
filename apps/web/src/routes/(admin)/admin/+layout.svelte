<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isStaff } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { flash } from '$lib/flash.svelte';

  let { children }: { children: Snippet } = $props();

  const staff = $derived(!!session.user && isStaff(session.user.privileges));

  // Logged-out visitors are sent to log in. Everyone else without staff access sees a plain not-found page,
  // so the panel's existence isn't advertised.
  $effect(() => {
    if (!session.ready || session.user) return;
    flash.next('warning', 'You need to login first.');
    goto(`/login?redir=${encodeURIComponent(page.url.pathname)}`, { replaceState: true });
  });
</script>

<svelte:head><title>Admin · RealistikOsu</title></svelte:head>

{#if session.user && !staff}
  <NotFound />
{:else if staff}
  <Banner image="settings.jpg"><h1>Admin</h1></Banner>

  <main class="wrap settings">
    <nav class="settings-menu"></nav>
    <div class="settings-body">{@render children()}</div>
  </main>
{/if}
