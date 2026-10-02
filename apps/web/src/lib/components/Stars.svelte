<script lang="ts">
  import { starColour, starTextColour } from '$lib/beatmaps';
  import { number } from '$lib/format';

  let { value }: { value: number } = $props();
</script>

<span class="stars" style="background: {starColour(value)}; color: {starTextColour(value)}">
  <i class="fa-solid fa-star"></i>{number(value, 2)}
</span>
