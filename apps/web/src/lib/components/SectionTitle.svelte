<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    colour,
    icon,
    children
  }: {
    colour: string;
    icon: string;
    children: Snippet;
  } = $props();

  const family = $derived(icon === 'fa-discord' || icon === 'fa-twitch' ? 'fa-brands' : 'fa-solid');
</script>

<h2 class="section-title {colour}"><i class="{family} {icon}"></i>{@render children()}</h2>
