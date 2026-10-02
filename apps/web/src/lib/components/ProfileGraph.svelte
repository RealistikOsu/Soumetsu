<script lang="ts">
  import { ChartOverlay, inView } from '@soumetsu/ui';
  import type { ChartPoint } from '@soumetsu/ui';
  import { number } from '$lib/format';
  import type { GraphPoint } from '$lib/graph';

  let {
    points,
    // Rank graphs put rank 1 at the top.
    inverted = false,
    unit = ''
  }: {
    points: GraphPoint[];
    inverted?: boolean;
    unit?: string;
  } = $props();

  const W = 800;
  const H = 200;
  const LEFT = 44;
  const TOP = 10;
  const BOTTOM = 24;

  const bounds = $derived.by(() => {
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min || 1) * 0.1;
    return { lo: min - pad, hi: max + pad };
  });
  const span = $derived({
    from: points[0].time,
    to: Math.max(points[points.length - 1].time, points[0].time + 1)
  });

  const x = (time: number) => LEFT + ((time - span.from) / (span.to - span.from)) * (W - LEFT);
  const y = (value: number) => {
    const t = (value - bounds.lo) / (bounds.hi - bounds.lo);
    return TOP + (inverted ? t : 1 - t) * (H - TOP - BOTTOM);
  };

  const grid = $derived(
    [0, 1, 2, 3].map((i) => {
      const value = bounds.lo + ((bounds.hi - bounds.lo) * i) / 3;
      return { y: y(value), label: compact(value) };
    })
  );

  // One label per month at most, thinned out to fit, and the ends are anchored so nothing is clipped.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a throwaway date, not reactive state
  const ticks = $derived.by(() => {
    const labels: { x: number; label: string }[] = [];
    const first = new Date(span.from);
    const cursor = new Date(first.getFullYear(), first.getMonth() + 1, 1);
    while (cursor.getTime() < span.to) {
      labels.push({
        x: x(cursor.getTime()),
        label: cursor.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (labels.length < 3) {
      return [0, 1, 2, 3]
        .map((i) => {
          const time = span.from + ((span.to - span.from) * i) / 3;
          return {
            x: x(time),
            label: new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          };
        })
        .filter((l) => l.x > LEFT + 20 && l.x < W - 32);
    }
    const step = Math.ceil(labels.length / 5);
    return labels.filter((l, i) => i % step === 0 && l.x < W - 32 && l.x > LEFT + 20);
  });

  function compact(value: number) {
    return Math.abs(value) >= 10_000 ? `${Math.round(value / 1000)}k` : String(Math.round(value));
  }

  const line = $derived(
    points.map((p) => `${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  );
  const showDots = $derived(points.length <= 40);

  let box = $state<HTMLElement>();
  let svg = $state<SVGSVGElement>();
  let active = $state(-1);
  let point = $state<ChartPoint | null>(null);

  function onMove(event: PointerEvent) {
    const area = svg!.getBoundingClientRect();
    const px = ((event.clientX - area.left) / area.width) * W;
    let nearest = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(points[i].time) - px) < Math.abs(x(points[nearest].time) - px)) nearest = i;
    }
    active = nearest;
    const p = points[nearest];
    point = {
      x: (x(p.time) / W) * area.width,
      y: (y(p.value) / H) * area.height,
      value: `${inverted ? '#' : ''}${number(p.value)}${unit}`,
      label: new Date(p.time).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      marker: !showDots
    };
  }

  function onLeave() {
    active = -1;
    point = null;
  }
</script>

<div class="panel chart c-blue" bind:this={box} use:inView>
  <svg
    bind:this={svg}
    viewBox="0 0 {W} {H}"
    role="img"
    aria-label={inverted ? 'Rank over time' : 'pp over time'}
    onpointermove={onMove}
    onpointerleave={onLeave}
  >
    {#each grid as g (g.y)}
      <line class="grid-line" x1={LEFT} x2={W} y1={g.y} y2={g.y} />
      <text class="axis" x="0" y={g.y + 4}>{g.label}</text>
    {/each}
    {#each ticks as tick (tick.x)}
      <text class="axis" x={tick.x} y={H} text-anchor="middle">{tick.label}</text>
    {/each}
    <polyline class="line" points={line} pathLength="1" />
    {#if showDots}
      {#each points as p, i (i)}
        <circle
          class="dot"
          class:active={i === active}
          cx={x(p.time)}
          cy={y(p.value)}
          r="3"
          style="--i: {i}"
        />
      {/each}
    {/if}
  </svg>
  {#if box && svg}
    <ChartOverlay {box} {svg} {point} />
  {/if}
</div>
