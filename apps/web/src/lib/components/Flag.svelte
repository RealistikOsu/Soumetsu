<script lang="ts">
  import { flagUrl } from '$lib/assets';
  import { countryName, isCountry } from '$lib/countries';

  let { country }: { country: string } = $props();

  const name = $derived(countryName(country));
</script>

<img
  class="flag"
  src={isCountry(country) ? flagUrl(country) : '/img/flags/fallback.png'}
  alt={name}
  title={name}
/>
