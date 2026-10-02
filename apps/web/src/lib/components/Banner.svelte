<script lang="ts">
  import type { Snippet } from 'svelte';
  import AlertStack from './AlertStack.svelte';

  let {
    image,
    url,
    class: className = '',
    alerts = true,
    children
  }: {
    // A file under /img/headers, or a full url (a beatmap's cover) instead.
    image?: string;
    url?: string;
    class?: string;
    alerts?: boolean;
    children: Snippet;
  } = $props();
</script>

<section class="banner {className}" style="background-image: url({url ?? `/img/headers/${image}`})">
  <div class="wrap">{@render children()}</div>
</section>
{#if alerts}
  <AlertStack />
{/if}
