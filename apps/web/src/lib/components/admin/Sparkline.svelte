<script lang="ts">
  import { ChartOverlay, inView } from '@soumetsu/ui';
  import type { ChartPoint } from '@soumetsu/ui';

  // Values are evenly spaced over the span, ending now.
  let { values, spanMinutes }: { values: number[]; spanMinutes: number } = $props();

  const W = 1000;
  const H = 64;
  const FILL = (H - 4) / H;
  const peak = $derived(Math.max(...values, 1));
  const path = $derived.by(() => {
    const step = W / (values.length - 1);
    const points = values.map(
      (v, i) => `L${(i * step).toFixed(1)},${(H - (v / peak) * (H - 4)).toFixed(1)}`
    );
    return `M0,${H} ${points.join(' ')} L${W},${H} Z`;
  });

  let box = $state<HTMLElement>();
  let svg = $state<SVGSVGElement>();
  let point = $state<ChartPoint | null>(null);

  function minutesAgo(minutes: number) {
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m ago` : `${hours}h ago`;
  }

  function onMove(event: PointerEvent) {
    const area = svg!.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientX - area.left) / area.width, 0), 1);
    const i = Math.round(fraction * (values.length - 1));
    point = {
      x: (i / (values.length - 1)) * area.width,
      y: area.height - (values[i] / peak) * area.height * FILL,
      value: `${values[i]} online`,
      label: minutesAgo(Math.round(((values.length - 1 - i) * spanMinutes) / (values.length - 1))),
      marker: true
    };
  }
</script>

<!-- A touch has no hover, so a tapped point stays until the next tap somewhere else. -->
<svelte:window
  onpointerdown={(event) => box && !box.contains(event.target as Node) && (point = null)}
/>

<div class="spark" bind:this={box} use:inView>
  <svg
    bind:this={svg}
    viewBox="0 0 {W} {H}"
    preserveAspectRatio="none"
    onpointerdown={onMove}
    onpointermove={onMove}
    onpointerleave={(event) => event.pointerType === 'mouse' && (point = null)}
    role="img"
    aria-label="Players online"
  >
    <path d={path} />
  </svg>
  {#if box && svg}<ChartOverlay {box} {svg} {point} />{/if}
</div>
