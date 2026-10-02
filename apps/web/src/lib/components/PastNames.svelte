<script lang="ts">
  import { scale } from 'svelte/transition';
  import { ms } from '$lib/motion';

  let { names }: { names: string[] } = $props();

  let open = $state(false);
  let root: HTMLElement;
</script>

<svelte:window
  onclick={(event) => {
    if (open && !root.contains(event.target as Node)) open = false;
  }}
  onkeydown={(event) => event.key === 'Escape' && (open = false)}
/>

<div class="past-names" bind:this={root}>
  <button
    type="button"
    title="Previous usernames"
    aria-label="Previous usernames"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <i class="fa-solid fa-clock-rotate-left"></i>{names.length}
  </button>
  {#if open}
    <div transition:scale={{ start: 0.95, duration: ms(180) }} style="transform-origin: top left">
      <span>Previously known as</span>
      <ol>
        {#each names as name (name)}<li>{name}</li>{/each}
      </ol>
    </div>
  {/if}
</div>
