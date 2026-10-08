<script lang="ts">
  import {
    playGame,
    type GameInfo,
    type PlinkoInfo,
    type PlinkoResult,
    type Risk
  } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import GameShell, { decimal } from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms, reducedMotion } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Play = { bet: number; payout: number; multiplier: number; balance: number };
  type Ball = { id: number; rows: number; path: number[]; play: Play; landed: boolean };

  const risks: Risk[] = ['low', 'medium', 'high'];
  const riskLabel: Record<Risk, () => string> = {
    low: m.casino_risk_low,
    medium: m.casino_risk_medium,
    high: m.casino_risk_high
  };

  let bet = $state(100);
  let rows = $state(8);
  let risk = $state<Risk>('medium');
  let pending = $state(false);
  let balls = $state.raw<Ball[]>([]);
  let last = $state.raw<Play | null>(null);
  let lit = $state.raw<{ index: number; seq: number } | null>(null);
  let nextId = 0;

  // The board is square and every peg, ball and bucket sits on the same pitch.
  const pitch = $derived(100 / (rows + 2));
  const rowY = (row: number, count: number) => ((row + 1) * 100) / (count + 2);
  const pegs = $derived(
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: r + 3 }, (_, j) => ({
        x: 50 + (j - (r + 2) / 2) * pitch,
        y: rowY(r, rows)
      }))
    ).flat()
  );

  const tone = (value: number) =>
    value >= 10 ? 'gold' : value >= 2 ? 'good' : value >= 1 ? 'even' : 'poor';

  function land(ball: { rows: number; path: number[]; play: Play }) {
    last = ball.play;
    coins.set(ball.play.balance);
    lit = { index: ball.path.reduce((a, b) => a + b, 0), seq: (lit?.seq ?? 0) + 1 };
  }

  function fall(node: HTMLElement, ball: Ball) {
    const step = 100 / (ball.rows + 2);
    let x = 50;
    const frames: { left: string; top: string; easing?: string }[] = [
      { left: '50%', top: `${step * 0.2}%`, easing: 'ease-in' }
    ];
    ball.path.forEach((right, row) => {
      frames.push({
        left: `${x}%`,
        top: `${rowY(row, ball.rows) - step * 0.4}%`,
        easing: 'ease-in'
      });
      x += right ? step / 2 : -step / 2;
    });
    frames.push({ left: `${x}%`, top: `${rowY(ball.rows, ball.rows)}%` });

    const finish = () => {
      if (ball.landed) return;
      ball.landed = true;
      land(ball);
      balls = balls.filter((b) => b.id !== ball.id);
    };
    const animation = node.animate(frames, {
      duration: ms((ball.rows + 1) * 350),
      fill: 'forwards'
    });
    animation.onfinish = finish;
    // Leaving the page mid-fall still settles the balance.
    return { destroy: finish };
  }

  async function drop(event: SubmitEvent, minBet: number) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = minBet;
    pending = true;
    const placed = bet;
    try {
      const play = await playGame<PlinkoResult>('plinko', { bet: placed, rows, risk });
      const ball = {
        rows,
        path: play.result.path,
        play: {
          bet: placed,
          payout: play.payout,
          multiplier: play.multiplier,
          balance: play.balance
        }
      };
      if (reducedMotion()) land(ball);
      else balls = [...balls, { ...ball, id: nextId++, landed: false }];
    } catch (error) {
      flash.show('error', describe(error));
      coins.refresh().catch(() => {});
    }
    pending = false;
  }
</script>

<GameShell game="plinko">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: GameInfo<PlinkoInfo>;
    info: PlinkoInfo;
    balance: number;
    blocked: boolean;
  })}
    {@const table = info.tables[risk]?.[String(rows)] ?? []}
    {@const locked = pending || balls.length > 0}
    <section class="panel cs-game">
      <form class="cs-form cs-controls" onsubmit={(e) => drop(e, limits.minBet)}>
        <BetInput
          bind:value={bet}
          min={limits.minBet}
          max={limits.maxBet}
          {balance}
          disabled={pending}
        />
        <div class="cs-field">
          <span>{m.casino_rows()}</span>
          <div class="cs-sides cs-seg" role="radiogroup" aria-label={m.casino_rows()}>
            {#each info.rows as option (option)}
              <button
                type="button"
                role="radio"
                aria-checked={rows === option}
                class:active={rows === option}
                disabled={locked}
                onclick={() => (rows = option)}
              >
                {option}
              </button>
            {/each}
          </div>
        </div>
        <div class="cs-field">
          <span>{m.casino_risk()}</span>
          <div class="cs-sides cs-seg" role="radiogroup" aria-label={m.casino_risk()}>
            {#each risks as option (option)}
              <button
                type="button"
                role="radio"
                aria-checked={risk === option}
                class:active={risk === option}
                disabled={locked}
                onclick={() => (risk = option)}
              >
                {riskLabel[option]()}
              </button>
            {/each}
          </div>
        </div>
        <button class="btn btn-blue cs-go" type="submit" disabled={pending || blocked}>
          {m.casino_drop()}
        </button>
        {#if last}
          <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
        {/if}
      </form>

      <div class="cs-stage">
        <div class="cs-plinko" style="--pitch: {pitch}">
          {#each pegs as peg, i (i)}
            <span class="cs-peg" style="left: {peg.x}%; top: {peg.y}%"></span>
          {/each}
          {#each table as value, i (lit?.index === i ? `${i}:${lit.seq}` : i)}
            <span
              class="cs-bucket {tone(value)}"
              class:hit={lit?.index === i}
              style="left: {50 + (i - rows / 2) * pitch}%; top: {rowY(rows, rows)}%"
            >
              {decimal(value)}
            </span>
          {/each}
          {#each balls as ball (ball.id)}
            <span class="cs-ball" use:fall={ball}></span>
          {/each}
        </div>
      </div>
    </section>
  {/snippet}
</GameShell>
