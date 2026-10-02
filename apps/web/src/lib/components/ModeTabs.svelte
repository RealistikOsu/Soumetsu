<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { allowed, modeNames } from '$lib/modes';

  let {
    mode,
    rx,
    onselect
  }: {
    mode: number;
    rx: number;
    onselect: (mode: number) => void;
  } = $props();
</script>

<nav class="tabs" use:tabInk>
  {#each modeNames as name, i (name)}
    <a
      class:active={i === mode}
      class:disabled={!allowed(i, rx)}
      href="?mode={i}"
      onclick={(event) => {
        event.preventDefault();
        if (allowed(i, rx)) onselect(i);
      }}
    >
      <img src="/img/modes/mode-{i}.png" alt="" />{name}
    </a>
  {/each}
</nav>
