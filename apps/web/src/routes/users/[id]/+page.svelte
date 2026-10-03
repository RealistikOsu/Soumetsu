<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { siteApi } from '$lib/api/site';
  import NotFound from '$lib/components/NotFound.svelte';
  import ProfileView from '$lib/components/ProfileView.svelte';

  const param = $derived(decodeURIComponent(page.params.id ?? ''));
  const numeric = $derived(/^\d+$/.test(param));
  let missing = $state(false);

  // A name in the URL is resolved to the player's ID, as on Hanayo.
  $effect(() => {
    if (numeric) return;
    missing = false;
    siteApi.get<number>('/users/resolve', { name: param }).then(
      (id) => goto(`/users/${id}${page.url.search}`, { replaceState: true }),
      () => (missing = true)
    );
  });
</script>

{#if numeric}
  {#key param}
    <ProfileView id={Number(param)} />
  {/key}
{:else if missing}
  <NotFound user />
{/if}
