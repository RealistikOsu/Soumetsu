<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { allowed, isLazer, relaxColours, relaxNames } from '$lib/modes';

  let {
    mode,
    rx,
    lazer = true,
    onselect
  }: {
    mode: number;
    rx: number;
    lazer?: boolean;
    onselect: (rx: number) => void;
  } = $props();
</script>

<nav class="tabs tinted scroll" use:tabInk>
  {#each relaxNames as name, i (name)}
    {#if lazer || !isLazer(i)}
      <a
        class="{relaxColours[i]} {i === rx ? 'active' : ''}"
        class:disabled={!allowed(mode, i)}
        href="?rx={i}"
        onclick={(event) => {
          event.preventDefault();
          if (allowed(mode, i)) onselect(i);
        }}
      >
        {name}
      </a>
    {/if}
  {/each}
</nav>
