<script lang="ts" module>
  // Only one preview plays at a time across the page.
  let current: { audio: HTMLAudioElement; stop: () => void } | null = null;

  export function stopPreview() {
    current?.stop();
    current = null;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { previewUrl } from '$lib/assets';

  let {
    setId,
    class: className = '',
    label = 'Play preview',
    children
  }: {
    setId: number;
    class?: string;
    label?: string;
    children?: Snippet<[boolean]>;
  } = $props();

  let playing = $state(false);
  let audio: HTMLAudioElement | undefined;

  function stop() {
    audio?.pause();
    playing = false;
  }

  function toggle() {
    if (playing) return stopPreview();
    stopPreview();
    audio ??= new Audio(previewUrl(setId));
    audio.volume = 0.4;
    audio.onended = stop;
    audio.play();
    playing = true;
    current = { audio, stop };
  }

  onDestroy(() => {
    if (current?.audio === audio) stopPreview();
  });
</script>

<button
  class="{className} {playing ? 'playing' : ''}"
  type="button"
  aria-label={label}
  onclick={toggle}
>
  {#if children}
    {@render children(playing)}
  {:else}
    <i class="fa-solid {playing ? 'fa-pause' : 'fa-play'}"></i>
  {/if}
</button>
