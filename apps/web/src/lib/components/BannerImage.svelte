<script lang="ts">
  import type { BannerPosition } from '$lib/api/site';

  // An uploaded banner, cropped to whatever shape its box has around the point its owner picked.
  let {
    src,
    position,
    class: className = ''
  }: { src: string; position: BannerPosition; class?: string } = $props();

  let broken = $state<string | null>(null);
</script>

{#if broken !== src}
  <div class="banner-image {className}">
    <img
      {src}
      alt=""
      draggable="false"
      style:object-position="{position.x}% {position.y}%"
      style:transform-origin="{position.x}% {position.y}%"
      style:transform="scale({position.zoom / 100})"
      onerror={() => (broken = src)}
    />
  </div>
{/if}
