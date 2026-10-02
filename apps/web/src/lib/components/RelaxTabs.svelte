<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { relaxColours, relaxNames } from '$lib/modes';

  let { rx, onselect }: { rx: number; onselect: (rx: number) => void } = $props();
</script>

<nav class="tabs tinted" use:tabInk>
  {#each relaxNames as name, i (name)}
    <a
      class="{relaxColours[i]} {i === rx ? 'active' : ''}"
      href="?rx={i}"
      onclick={(event) => {
        event.preventDefault();
        onselect(i);
      }}
    >
      {name}
    </a>
  {/each}
</nav>
