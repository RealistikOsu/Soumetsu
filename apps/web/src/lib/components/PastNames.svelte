<script lang="ts">
  import { scale } from 'svelte/transition';
  import { ms } from '$lib/motion';

  let { names }: { names: string[] } = $props();

  let open = $state(false);
  let root: HTMLElement;
  let leaving: ReturnType<typeof setTimeout>;

  // A mouse opens it by hovering, with a short grace period for crossing the gap to the list;
  // touch has no hover, so tapping still toggles it.
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(leaving);
    open = true;
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    leaving = setTimeout(() => (open = false), 150);
  };
</script>

<svelte:window
  onclick={(event) => {
    if (open && !root.contains(event.target as Node)) open = false;
  }}
  onkeydown={(event) => event.key === 'Escape' && (open = false)}
/>

<div class="past-names" role="group" bind:this={root} onpointerenter={enter} onpointerleave={leave}>
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
