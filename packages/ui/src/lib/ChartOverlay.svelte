<script lang="ts">
  import type { ChartPoint } from './chart';

  let { box, svg, point }: { box: HTMLElement; svg: SVGElement; point: ChartPoint | null } =
    $props();

  let tip = $state<HTMLElement>();
  let placed = $state({ left: 0, top: 0, tipLeft: 0, guideTop: 0, guideHeight: 0, below: false });

  $effect(() => {
    if (!point || !tip) return;
    const area = svg.getBoundingClientRect();
    const outer = box.getBoundingClientRect();
    const left = area.left - outer.left + point.x;
    const top = area.top - outer.top + point.y;
    const half = tip.offsetWidth / 2;

    // Flip under the point when there isn't room above it inside whatever clips the chart.
    let clip = box;
    while (clip.parentElement && getComputedStyle(clip).overflow === 'visible') {
      clip = clip.parentElement;
    }
    const roomAbove = outer.top + top - clip.getBoundingClientRect().top;

    placed = {
      left,
      top,
      tipLeft: Math.min(Math.max(left, half + 4), outer.width - half - 4),
      guideTop: area.top - outer.top,
      guideHeight: area.height,
      below: roomAbove < tip.offsetHeight + 16
    };
  });
</script>

{#if point}
  <div
    class="chart-guide"
    style="left: {placed.left}px; top: {placed.guideTop}px; height: {placed.guideHeight}px"
  ></div>
  {#if point.marker}
    <div class="chart-marker" style="left: {placed.left}px; top: {placed.top}px"></div>
  {/if}
  <div
    class="chart-tip"
    class:below={placed.below}
    bind:this={tip}
    style="left: {placed.tipLeft}px; top: {placed.top}px"
  >
    <b>{point.value}</b><span>{point.label}</span>
  </div>
{/if}
