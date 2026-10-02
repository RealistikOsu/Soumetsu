<script lang="ts">
  import { ChartOverlay, inView } from '@soumetsu/ui';
  import type { ChartPoint } from '@soumetsu/ui';

  // Values are evenly spaced over the span, ending now.
  let { values, spanMinutes }: { values: number[]; spanMinutes: number } = $props();

  const FILL = 0.85;
  const peak = $derived(Math.max(...values));
  const path = $derived.by(() => {
    const step = 1000 / (values.length - 1);
    const points = values.map(
      (v, i) => `L${(i * step).toFixed(1)},${(40 - (v / peak) * 34).toFixed(1)}`
    );
    return `M0,40 ${points.join(' ')} L1000,40 Z`;
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

<div class="online-graph" bind:this={box} use:inView>
  <span>Max {peak} players in the last {Math.round(spanMinutes / 60)}h</span>
  <svg
    bind:this={svg}
    viewBox="0 0 1000 40"
    preserveAspectRatio="none"
    onpointermove={onMove}
    onpointerleave={() => (point = null)}
    role="img"
    aria-label="Players online"
  >
    <path d={path} />
  </svg>
  {#if box && svg}
    <ChartOverlay {box} {svg} {point} />
  {/if}
</div>
