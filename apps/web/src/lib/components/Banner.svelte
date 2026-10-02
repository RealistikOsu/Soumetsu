<script lang="ts">
  import type { Snippet } from 'svelte';
  import AlertStack from './AlertStack.svelte';

  let {
    image,
    class: className = '',
    alerts = true,
    children
  }: {
    image: string;
    class?: string;
    alerts?: boolean;
    children: Snippet;
  } = $props();
</script>

<section class="banner {className}" style="background-image: url(/img/headers/{image})">
  <div class="wrap">{@render children()}</div>
</section>
{#if alerts}
  <AlertStack />
{/if}
