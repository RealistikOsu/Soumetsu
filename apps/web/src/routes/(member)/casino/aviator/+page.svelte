<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    aviatorCashout,
    aviatorStart,
    aviatorStream,
    gameInfo,
    type AviatorCurve,
    type AviatorEvent,
    type AviatorInfo,
    type AviatorResult,
    type AviatorView,
    type GameInfo,
    type Settled
  } from '$lib/api/casino';
  import { isApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { payoutPreview, wait } from '$lib/casino';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { compact, length, number } from '$lib/format';
  import { reducedMotion } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Limits = GameInfo<AviatorInfo, AviatorView>;
  type Play = { bet: number; payout: number; multiplier: number; result: AviatorResult };

  // The readout may run this far past the server's last tick, and no further:
  // the flight might crash before it gets there.
  const LEAD = 0.05;
  const RETRY = 1000;
  const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120];
  const HEIGHT = 280;
  const PAD = { top: 72, right: 24, bottom: 28, left: 52 };

  const motion = !reducedMotion();

  let bet = $state(100);
  let pending = $state(false);
  // undefined until the game info has loaded, so a flight in the air resumes.
  let flight = $state.raw<AviatorView | null | undefined>(undefined);
  let last = $state.raw<Play | null>(null);
  let tick = $state(1);
  // Local clock minus server clock, plus the delay ticks arrive with. null until known.
  let skew = $state<number | null>(null);
  let now = $state(0);
  let width = $state(0);
  let cashing = false;
  let stream: AbortController | null = null;
  const leaving = new AbortController();

  const hundredths = (value: number) => Math.floor(value * 100 + 1e-9) / 100;
  const raw = (curve: AviatorCurve, seconds: number) =>
    seconds <= 0 ? 1 : 1 + Math.pow(seconds * curve.rate, curve.power);
  const secondsTo = (curve: AviatorCurve, value: number) =>
    value <= 1 ? 0 : Math.pow(value - 1, 1 / curve.power) / curve.rate;
  const times = (value: number) => `×${number(value, 2)}`;

  const live = $derived.by(() => {
    if (!flight) return 1;
    if (!motion || skew === null) return tick;
    const local = hundredths(raw(flight.curve, (now - flight.startedAt - skew) / 1000));
    return Math.min(Math.max(local, tick), hundredths(tick + LEAD));
  });

  function nice(span: number) {
    const base = 10 ** Math.floor(Math.log10(span));
    return ([1, 2, 5, 10].find((step) => step * base >= span) ?? 10) * base;
  }

  function plot(curve: AviatorCurve, value: number) {
    const w = Math.max(width, 200);
    const h = w < 500 ? 220 : HEIGHT;
    const elapsed = secondsTo(curve, value);
    const tMax = Math.max(8, elapsed * 1.25);
    const mMax = Math.max(2, 1 + (value - 1) * 1.3);
    const x = (t: number) => PAD.left + (t / tMax) * (w - PAD.left - PAD.right);
    const y = (v: number) => h - PAD.bottom - ((v - 1) / (mMax - 1)) * (h - PAD.top - PAD.bottom);

    const points = Array.from({ length: 49 }, (_, i) => {
      const t = (elapsed * i) / 48;
      return [x(t), y(Math.min(raw(curve, t), value))];
    });
    const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`);
    const [tipX, tipY] = points[48];
    const [prevX, prevY] = points[47];
    const angle = elapsed ? (Math.atan2(tipY - prevY, tipX - prevX) * 180) / Math.PI : 0;

    const mStep = nice((mMax - 1) / 4);
    const tSpan = tMax / 5;
    const tStep = TIME_STEPS.find((step) => step >= tSpan) ?? Math.ceil(tSpan / 120) * 120;
    // Whole steps don't need decimals, and ×1,000.00 wouldn't fit beside the chart.
    const mLabel = (v: number) => (mStep >= 1 ? `×${compact(v)}` : times(v));
    return {
      w,
      h,
      line: line.join(''),
      area: `${line.join('')}L${tipX.toFixed(1)},${y(1)}L${x(0)},${y(1)}Z`,
      tip: { x: tipX, y: tipY, angle },
      rows: Array.from(
        { length: Math.floor((mMax - 1) / mStep) },
        (_, i) => 1 + (i + 1) * mStep
      ).map((v) => ({ y: y(v), label: mLabel(v) })),
      cols: Array.from({ length: Math.floor(tMax / tStep) + 1 }, (_, i) => i * tStep).map((t) => ({
        x: x(t),
        label: length(t)
      })),
      base: y(1),
      left: PAD.left,
      right: w - PAD.right
    };
  }

  function stop() {
    stream?.abort();
    stream = null;
  }
  onDestroy(() => {
    leaving.abort();
    stop();
  });

  function follow(view: AviatorView) {
    stop();
    if (leaving.signal.aborted) return;
    const control = new AbortController();
    stream = control;
    (async () => {
      while (!control.signal.aborted) {
        try {
          await aviatorStream((event) => heard(event, view.startedAt), control.signal);
        } catch {
          // Dropped; reconnect below while the flight is still ours.
        }
        if (control.signal.aborted) return;
        await wait(RETRY, control.signal);
      }
    })();
  }

  function adopt(view: AviatorView, clock: number | null) {
    if (leaving.signal.aborted) return;
    flight = view;
    tick = 1;
    skew = clock;
    now = Date.now();
    last = null;
    follow(view);
  }

  // The stream follows whatever flight the server has, so another flight's events
  // mean ours is over: settled somewhere else.
  function lost() {
    stop();
    flight = null;
    reload();
    coins.refresh().catch(() => {});
  }

  function heard(event: AviatorEvent, startedAt: number) {
    if (flight?.startedAt !== startedAt) return;
    if (event.type !== 'done' && event.startedAt !== startedAt) {
      if (!cashing) lost();
      else stop();
      return;
    }
    if (event.type === 'tick') {
      tick = Math.max(tick, event.m);
      if (event.m > 1) {
        const seen = Date.now() - startedAt - secondsTo(flight.curve, event.m) * 1000;
        skew = skew === null ? seen : Math.min(skew, seen);
      }
    } else if (event.type === 'crash') {
      stop();
      last = {
        bet: flight.bet,
        payout: 0,
        multiplier: 0,
        result: { crashPoint: event.crashPoint, cashOutAt: null, won: false }
      };
      flight = null;
      coins.set(event.balance);
    } else {
      // A cash out in flight settles it; otherwise another tab or request did.
      if (cashing) stop();
      else lost();
    }
  }

  function settle(play: Settled<AviatorView, AviatorResult>) {
    stop();
    flight = null;
    last = {
      bet: play.view.bet,
      payout: play.payout,
      multiplier: play.multiplier,
      result: play.result
    };
    coins.set(play.balance);
  }

  async function reload() {
    try {
      const info = await gameInfo<AviatorInfo, AviatorView>('aviator');
      if (info.pending && info.pending.startedAt !== flight?.startedAt) adopt(info.pending, null);
    } catch {
      // Nothing to resume.
    }
  }

  function ready(limits: Limits) {
    if (flight === undefined) {
      if (limits.pending) adopt(limits.pending, null);
      else flight = null;
    }
    coins.refresh().catch(() => {});
  }

  async function failed(error: unknown) {
    flash.show('error', describe(error));
    if (isApiError(error) && error.code === 'casino.game_pending') await reload();
    else if (isApiError(error) && error.code === 'casino.no_game') {
      stop();
      flight = null;
    }
    coins.refresh().catch(() => {});
  }

  async function start(event: SubmitEvent, limits: Limits) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = limits.minBet;
    pending = true;
    try {
      const started = await aviatorStart(bet);
      adopt(started.view, Date.now() - started.view.startedAt);
      coins.set(started.balance);
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }

  async function cashOut(current: AviatorView) {
    pending = true;
    cashing = true;
    try {
      const play = await aviatorCashout();
      if (flight?.startedAt === current.startedAt) settle(play);
    } catch (error) {
      const gone = isApiError(error) && error.code === 'casino.no_game';
      if (flight?.startedAt !== current.startedAt) {
        // Already settled by a crash event.
      } else if (!stream) {
        // The stream ended while we waited, so nothing else will settle the flight.
        if (!gone) flash.show('error', describe(error));
        lost();
      } else if (!gone) {
        await failed(error);
      }
      // On no_game the stream's crash or done settles the page.
    }
    cashing = false;
    pending = false;
  }

  $effect(() => {
    if (!flight || !motion) return;
    let frame = 0;
    const step = () => {
      now = Date.now();
      frame = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(frame);
  });
</script>

<GameShell game="aviator" onready={ready}>
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: Limits;
    info: AviatorInfo;
    balance: number;
    blocked: boolean;
  })}
    {@const current = flight ?? null}
    {@const final = last
      ? last.result.won
        ? (last.result.cashOutAt ?? last.result.crashPoint)
        : last.result.crashPoint
      : 1}
    {@const value = current ? live : final}
    {@const chart = plot(current?.curve ?? info.curve, value)}
    {@const phase = current ? 'flying' : last ? (last.result.won ? 'won' : 'crashed') : 'idle'}
    <section class="panel cs-game cs-wide">
      {#if current}
        <form
          class="cs-form cs-controls"
          onsubmit={(e) => {
            e.preventDefault();
            cashOut(current);
          }}
        >
          <BetInput
            value={current.bet}
            min={limits.minBet}
            max={Math.max(limits.maxBet, current.bet)}
            balance={Math.max(balance, current.bet)}
            disabled
          />
          <button class="btn cs-go cs-cash" type="submit" disabled={pending}>
            {m.casino_cash_out()}
            <span><i class="fa-solid fa-coins"></i>{number(payoutPreview(current.bet, live))}</span>
          </button>
        </form>
      {:else}
        <form class="cs-form cs-controls" onsubmit={(e) => start(e, limits)}>
          <BetInput
            bind:value={bet}
            min={limits.minBet}
            max={limits.maxBet}
            {balance}
            disabled={pending}
          />
          <button class="btn btn-blue cs-go" type="submit" disabled={pending || blocked}>
            {m.casino_fly()}
          </button>
          {#if last}
            <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
          {/if}
        </form>
      {/if}

      <div class="cs-stage">
        <div class="cs-sky {phase}" bind:clientWidth={width}>
          <div class="cs-readout" aria-live="polite">
            <b>{times(value)}</b>
            {#if phase === 'flying'}
              <span>{m.casino_flying()}</span>
            {:else if phase === 'won'}
              <span>{m.casino_cashed_out()}</span>
            {:else if phase === 'crashed'}
              <span>{m.casino_crashed()}</span>
            {/if}
          </div>
          <svg viewBox="0 0 {chart.w} {chart.h}" height={chart.h} aria-hidden="true">
            {#each chart.rows as row (row.label)}
              <line class="grid" x1={chart.left} x2={chart.right} y1={row.y} y2={row.y} />
              <text
                class="axis"
                x={chart.left - 8}
                y={row.y}
                text-anchor="end"
                dominant-baseline="middle"
              >
                {row.label}
              </text>
            {/each}
            {#each chart.cols as col (col.label)}
              <text class="axis" x={col.x} y={chart.h - 8} text-anchor="middle">{col.label}</text>
            {/each}
            <line class="base" x1={chart.left} x2={chart.right} y1={chart.base} y2={chart.base} />
            {#if phase !== 'idle'}
              <path class="area" d={chart.area} />
              <path class="curve" d={chart.line} />
            {/if}
            {#if phase === 'crashed'}
              <text
                class="boom"
                x={chart.tip.x}
                y={chart.tip.y}
                text-anchor="middle"
                dominant-baseline="middle"
              >
                💥
              </text>
            {:else}
              <g transform="translate({chart.tip.x} {chart.tip.y}) rotate({chart.tip.angle})">
                <text class="plane" text-anchor="middle" dominant-baseline="middle">✈&#xfe0e;</text>
              </g>
            {/if}
          </svg>
        </div>
      </div>
    </section>
  {/snippet}
</GameShell>
