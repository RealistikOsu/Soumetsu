<script lang="ts">
  import { flagUrl } from '$lib/assets';

  let { country }: { country: string } = $props();

  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const name = $derived(names.of(country.toUpperCase()) ?? country.toUpperCase());
</script>

{#if country.toLowerCase() !== 'xx'}
  <img class="flag" src={flagUrl(country)} alt={name} title={name} />
{/if}
