<script lang="ts">
  import { onDestroy } from 'svelte';
  import { playGame, type GameInfo, type WheelInfo, type WheelResult } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import { multiplier, wait } from '$lib/casino';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Segment = WheelInfo['segments'][number];
  type Play = { bet: number; payout: number; multiplier: number; index: number; label: string };

  const SPIN = 3000;

  let bet = $state(100);
  let pending = $state(false);
  let angle = $state(0);
  let duration = $state(0);
  let last = $state.raw<Play | null>(null);
  const leaving = new AbortController();
  onDestroy(() => leaving.abort());

  const label = ([, value, type]: Segment) =>
    type === 'jackpot'
      ? m.casino_jackpot()
      : type === 'penalty' && value === 0
        ? m.casino_penalty()
        : multiplier(value);

  const tone = ([, value, type]: Segment) =>
    type === 'jackpot'
      ? 'jackpot'
      : type === 'penalty'
        ? value === 0
          ? 'void'
          : 'penalty'
        : value >= 5
          ? 'high'
          : value >= 2
            ? 'mid'
            : 'low';

  // Angles run clockwise from twelve o'clock, where the pointer sits.
  const point = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(Math.sin(rad) * r).toFixed(3)} ${(-Math.cos(rad) * r).toFixed(3)}`;
  };

  const slice = (i: number, count: number) => {
    const step = 360 / count;
    return `M0 0L${point(i * step, 100)}A100 100 0 0 1 ${point((i + 1) * step, 100)}Z`;
  };

  async function spin(event: SubmitEvent, limits: GameInfo<WheelInfo>) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = limits.minBet;
    pending = true;
    const placed = bet;
    try {
      const play = await playGame<WheelResult>('wheel', { bet: placed });
      const count = limits.info?.segments.length ?? 1;
      const centre = (play.result.segmentIndex + 0.5) * (360 / count);
      const offset = (((-centre - angle) % 360) + 360) % 360;
      last = null;
      duration = ms(SPIN);
      angle += 360 * 4 + offset;
      await wait(duration, leaving.signal);
      last = {
        bet: placed,
        payout: play.payout,
        multiplier: play.multiplier,
        index: play.result.segmentIndex,
        label: label([
          play.result.segment.label,
          play.result.segment.multiplier,
          play.result.segment.type
        ])
      };
      coins.set(play.balance);
    } catch (error) {
      flash.show('error', describe(error));
      coins.refresh().catch(() => {});
    }
    pending = false;
  }
</script>

<GameShell game="wheel">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: GameInfo<WheelInfo>;
    info: WheelInfo;
    balance: number;
    blocked: boolean;
  })}
    {@const step = 360 / info.segments.length}
    <section class="panel cs-game">
      <form class="cs-form cs-controls" onsubmit={(e) => spin(e, limits)}>
        <BetInput
          bind:value={bet}
          min={limits.minBet}
          max={limits.maxBet}
          {balance}
          disabled={pending}
        />
        <button class="btn btn-blue cs-go" type="submit" disabled={pending || blocked}>
          {pending ? m.casino_spinning() : m.casino_spin()}
        </button>
        {#if last}
          <p class="cs-landed">{m.casino_landed({ label: last.label })}</p>
          <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
        {/if}
      </form>

      <div class="cs-stage">
        <div class="cs-wheel">
          <span class="cs-pointer"></span>
          <svg
            class="cs-wheel-disc"
            viewBox="-100 -100 200 200"
            style="transform: rotate({angle}deg); transition-duration: {duration}ms"
            role="img"
            aria-label={m.casino_game_wheel()}
          >
            {#each info.segments as segment, i (i)}
              <path class="cs-slice {tone(segment)}" d={slice(i, info.segments.length)} />
              <text
                class="cs-slice-label {tone(segment)}"
                transform="rotate({(i + 0.5) * step}) translate(0 -92) rotate(90)"
              >
                {label(segment)}
              </text>
            {/each}
            {#if last}
              <path
                class="cs-slice-ring"
                transform="scale(0.992)"
                d={slice(last.index, info.segments.length)}
              />
            {/if}
            <circle class="cs-hub" r="14" />
          </svg>
        </div>
      </div>
    </section>
  {/snippet}
</GameShell>
