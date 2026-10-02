<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { allowed, relaxColours, relaxNames } from '$lib/modes';

  let {
    mode,
    rx,
    onselect
  }: {
    mode: number;
    rx: number;
    onselect: (rx: number) => void;
  } = $props();
</script>

<nav class="tabs tinted" use:tabInk>
  {#each relaxNames as name, i (name)}
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
  {/each}
</nav>
