<script lang="ts">
  import { ChartOverlay, inView } from '@soumetsu/ui';
  import type { ChartPoint } from '@soumetsu/ui';
  import { m } from '$lib/paraglide/messages';

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
    if (minutes < 1) return m.home_graph_now();
    if (minutes < 60) return m.home_graph_minutes_ago({ minutes });
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest
      ? m.home_graph_hours_minutes_ago({ hours, minutes: rest })
      : m.home_graph_hours_ago({ hours });
  }

  function onMove(event: PointerEvent) {
    const area = svg!.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientX - area.left) / area.width, 0), 1);
    const i = Math.round(fraction * (values.length - 1));
    point = {
      x: (i / (values.length - 1)) * area.width,
      y: area.height - (values[i] / peak) * area.height * FILL,
      value: m.home_graph_online({ count: values[i] }),
      label: minutesAgo(Math.round(((values.length - 1 - i) * spanMinutes) / (values.length - 1))),
      marker: true
    };
  }
</script>

<!-- A touch has no hover, so a tapped point stays until the next tap somewhere else. -->
<svelte:window
  onpointerdown={(event) => box && !box.contains(event.target as Node) && (point = null)}
/>

<div class="online-graph" bind:this={box} use:inView>
  <span>{m.home_graph_peak({ peak, hours: Math.round(spanMinutes / 60) })}</span>
  <svg
    bind:this={svg}
    viewBox="0 0 1000 40"
    preserveAspectRatio="none"
    onpointerdown={onMove}
    onpointermove={onMove}
    onpointerleave={(event) => event.pointerType === 'mouse' && (point = null)}
    role="img"
    aria-label={m.home_graph_aria()}
  >
    <path d={path} />
  </svg>
  {#if box && svg}
    <ChartOverlay {box} {svg} {point} />
  {/if}
</div>
