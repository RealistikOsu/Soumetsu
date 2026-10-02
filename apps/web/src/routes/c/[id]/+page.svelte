<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { resolveClan } from '$lib/api/clans';
  import ClanView from '$lib/components/ClanView.svelte';
  import NotFound from '$lib/components/NotFound.svelte';

  const param = $derived(decodeURIComponent(page.params.id ?? ''));
  const numeric = $derived(/^\d+$/.test(param));
  let missing = $state(false);

  // A name in the URL is resolved to the clan's ID.
  $effect(() => {
    if (numeric) return;
    missing = false;
    resolveClan(param).then(
      (id) => goto(`/c/${id}`, { replaceState: true }),
      () => (missing = true)
    );
  });
</script>

{#if numeric}
  {#key param}<ClanView id={Number(param)} />{/key}
{:else if missing}
  <NotFound />
{/if}
