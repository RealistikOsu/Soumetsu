<script lang="ts">
  import {
    playGame,
    type BetType,
    type GameInfo,
    type RouletteInfo,
    type RouletteResult
  } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import { multiplier } from '$lib/casino';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms, reducedMotion } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Play = { bet: number; payout: number; multiplier: number; result: RouletteResult };

  const ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
    31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const LOOPS = 7;
  const CELL = 48;
  const SPIN = 4000;
  const tape = Array.from({ length: ORDER.length * LOOPS }, (_, i) => ORDER[i % ORDER.length]);

  const betTypes: BetType[] = [
    'red',
    'black',
    'even',
    'odd',
    'low',
    'high',
    'dozen1',
    'dozen2',
    'dozen3',
    'col1',
    'col2',
    'col3',
    'straight'
  ];
  const colourLabel: Record<RouletteResult['color'], () => string> = {
    red: m.casino_rl_red,
    black: m.casino_rl_black,
    green: m.casino_rl_green
  };
  const betLabel: Record<BetType, () => string> = {
    straight: m.casino_rl_straight,
    red: m.casino_rl_red,
    black: m.casino_rl_black,
    even: m.casino_rl_even,
    odd: m.casino_rl_odd,
    low: m.casino_rl_low,
    high: m.casino_rl_high,
    dozen1: m.casino_rl_dozen1,
    dozen2: m.casino_rl_dozen2,
    dozen3: m.casino_rl_dozen3,
    col1: m.casino_rl_col1,
    col2: m.casino_rl_col2,
    col3: m.casino_rl_col3
  };

  let bet = $state(100);
  let betType = $state<BetType>('red');
  let betNumber = $state(0);
  let pending = $state(false);
  // Index into the tape of the cell under the marker; starts a loop in so there is tape either side.
  let at = $state(ORDER.length);
  let strip = $state<HTMLElement>();
  let last = $state.raw<Play | null>(null);

  const offset = (index: number) => `translateX(${-(index * CELL + CELL / 2)}px)`;
  const colour = (n: number, red: number[]) =>
    n === 0 ? 'green' : red.includes(n) ? 'red' : 'black';

  async function spin(event: SubmitEvent, limits: GameInfo<RouletteInfo>) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = limits.minBet;
    pending = true;
    const placed = bet;
    const body: Record<string, unknown> = { bet: placed, betType };
    if (betType === 'straight') body.betNumber = betNumber;
    try {
      const play = await playGame<RouletteResult>('roulette', body);
      last = null;
      // The tape repeats, so stepping back to the same number in the second loop is invisible.
      // It has no 00 pocket, so 00 lands on 0 like the casino showed it.
      const from = (at % ORDER.length) + ORDER.length;
      const pos = ORDER.indexOf(play.result.number);
      const to =
        from + ORDER.length * 3 + ((pos - (from % ORDER.length) + ORDER.length) % ORDER.length);
      at = to;
      if (strip && !reducedMotion()) {
        await strip.animate([{ transform: offset(from) }, { transform: offset(to) }], {
          duration: ms(SPIN),
          easing: 'cubic-bezier(0.15, 0.6, 0.2, 1)'
        }).finished;
      }
      last = { bet: placed, payout: play.payout, multiplier: play.multiplier, result: play.result };
      coins.set(play.balance);
    } catch (error) {
      flash.show('error', describe(error));
      coins.refresh().catch(() => {});
    }
    pending = false;
  }
</script>

<GameShell game="roulette">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: GameInfo<RouletteInfo>;
    info: RouletteInfo;
    balance: number;
    blocked: boolean;
  })}
    <section class="panel cs-game">
      <form class="cs-form cs-controls" onsubmit={(e) => spin(e, limits)}>
        <BetInput
          bind:value={bet}
          min={limits.minBet}
          max={limits.maxBet}
          {balance}
          disabled={pending}
        />
        <div class="cs-field">
          <div class="cs-sides cs-bets" role="radiogroup" aria-label={m.casino_bet_type()}>
            {#each betTypes as option (option)}
              <button
                type="button"
                role="radio"
                aria-checked={betType === option}
                class:active={betType === option}
                class:wide={option === 'straight'}
                disabled={pending}
                onclick={() => (betType = option)}
              >
                {betLabel[option]()}
                <small>{multiplier(info.payouts[option])}</small>
              </button>
            {/each}
          </div>
        </div>
        {#if betType === 'straight'}
          <div class="cs-field">
            <span>{m.casino_rl_number()}</span>
            <div class="cs-numbers" role="radiogroup" aria-label={m.casino_rl_number()}>
              {#each Array.from({ length: 37 }, (_, n) => n) as n (n)}
                <button
                  type="button"
                  role="radio"
                  aria-checked={betNumber === n}
                  class="cs-num {colour(n, info.red)}"
                  class:active={betNumber === n}
                  disabled={pending}
                  onclick={() => (betNumber = n)}
                >
                  {n}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        <button class="btn btn-blue cs-go" type="submit" disabled={pending || blocked}>
          {pending ? m.casino_spinning() : m.casino_spin()}
        </button>
        {#if last}
          <div class="cs-landed">
            <span
              class="cs-num {last.result.color}"
              role="img"
              aria-label="{last.result.pocket} {colourLabel[last.result.color]()}"
            >
              {last.result.pocket}
            </span>
          </div>
          <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
        {/if}
      </form>

      <div class="cs-stage">
        <div class="cs-tape" style="--cell: {CELL}px">
          <div class="cs-tape-strip" bind:this={strip} style="transform: {offset(at)}">
            {#each tape as n, i (i)}
              <span class="cs-num {colour(n, info.red)}" class:hit={last && i === at}>{n}</span>
            {/each}
          </div>
          <span class="cs-marker top"></span>
          <span class="cs-marker bottom"></span>
        </div>
      </div>
    </section>
  {/snippet}
</GameShell>
