<script lang="ts">
  import { fullDate, number, timeAgo } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let {
    peak,
    current,
    history
  }: {
    peak: { rank: number; time: number };
    current: number;
    history: { time: number; value: number }[];
  } = $props();

  const W = 228;
  const H = 52;
  const PAD = 6;

  const ranks = $derived(history.map((p) => p.value).filter((r) => r > 0));
  const spark = $derived.by(() => {
    if (ranks.length < 2) return null;
    const best = Math.min(...ranks);
    const worst = Math.max(...ranks);
    const step = (W - PAD * 2) / (ranks.length - 1);
    const y = (rank: number) => PAD + ((rank - best) / (worst - best || 1)) * (H - PAD * 2);
    const at = ranks.indexOf(peak.rank);
    return {
      points: ranks.map((r, i) => `${(PAD + i * step).toFixed(1)},${y(r).toFixed(1)}`).join(' '),
      dot: at === -1 ? null : { x: PAD + at * step, y: y(peak.rank) }
    };
  });
  const below = $derived(current - peak.rank);
</script>

<div class="peak-card" role="tooltip">
  <span class="peak-label"><i class="fa-solid fa-crown"></i>{m.profile_peak_label()}</span>
  <strong>#{number(peak.rank)}</strong>
  <span class="peak-when">{fullDate(peak.time / 1000)} · {timeAgo(peak.time / 1000)}</span>
  {#if spark}
    <svg class="peak-spark" viewBox="0 0 {W} {H}" aria-hidden="true">
      <polyline points={spark.points} pathLength="1" />
      {#if spark.dot}<circle cx={spark.dot.x} cy={spark.dot.y} r="4" />{/if}
    </svg>
  {/if}
  <div class="peak-foot">
    <span
      >{history.length
        ? m.profile_peak_since({ date: fullDate(history[0].time / 1000) })
        : ''}</span
    >
    <span>
      {m.profile_peak_now()} <b>#{number(current)}</b>,
      {below > 0 ? m.profile_peak_below({ count: number(below) }) : m.profile_peak_at()}
    </span>
  </div>
</div>
