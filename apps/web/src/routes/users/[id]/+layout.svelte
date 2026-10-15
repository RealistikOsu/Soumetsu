<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { siteApi } from '$lib/api/site';
  import NotFound from '$lib/components/NotFound.svelte';
  import ProfileShell from '$lib/components/ProfileShell.svelte';

  let { children }: { children: Snippet } = $props();

  const param = $derived(decodeURIComponent(page.params.id ?? ''));
  const numeric = $derived(/^\d+$/.test(param));
  let missing = $state(false);

  // A name in the URL is resolved to the player's ID, as on Hanayo.
  $effect(() => {
    if (numeric) return;
    missing = false;
    const rest = page.url.pathname.replace(/^\/users\/[^/]+/, '');
    siteApi.get<number>('/users/resolve', { name: param }).then(
      (id) => goto(`/users/${id}${rest}${page.url.search}`, { replaceState: true }),
      () => (missing = true)
    );
  });
</script>

{#if numeric}
  {#key param}
    <ProfileShell id={Number(param)}>{@render children()}</ProfileShell>
  {/key}
{:else if missing}
  <NotFound user />
{/if}
