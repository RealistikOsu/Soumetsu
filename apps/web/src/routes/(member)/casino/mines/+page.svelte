<script lang="ts">
  import {
    gameInfo,
    isSettled,
    minesCashout,
    minesReveal,
    minesStart,
    type GameInfo,
    type MinesInfo,
    type MinesResult,
    type MinesView,
    type Settled
  } from '$lib/api/casino';
  import { isApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { multiplier } from '$lib/casino';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  type Limits = GameInfo<MinesInfo>;
  type Play = { bet: number; payout: number; multiplier: number; result: MinesResult };

  let bet = $state(100);
  let mines = $state(5);
  let pending = $state(false);
  // undefined until the page has acted, so the server's pending game shows on load.
  let board = $state.raw<MinesView | null | undefined>(undefined);
  let last = $state.raw<Play | null>(null);

  // GameShell types the pending game as a poker hand; for this game it's the view.
  const active = (limits: Limits) =>
    board === undefined
      ? ((limits.pending as unknown as MinesView | null | undefined) ?? null)
      : board;

  const payout = (view: MinesView) => Math.floor(view.bet * view.multiplier);

  function tile(i: number, current: MinesView | null) {
    if (current) return current.revealed.includes(i) ? '💎' : '';
    const result = last?.result;
    if (!result) return '';
    if (result.hit === i) return '💥';
    if (result.mines.includes(i)) return '💣';
    return result.revealed.includes(i) ? '💎' : '';
  }

  function settle(play: Settled<MinesView, MinesResult>) {
    board = null;
    last = {
      bet: play.view.bet,
      payout: play.payout,
      multiplier: play.multiplier,
      result: play.result
    };
    coins.set(play.balance);
  }

  async function failed(error: unknown) {
    flash.show('error', describe(error));
    if (isApiError(error) && error.code === 'casino.game_pending') await reload();
    else if (isApiError(error) && error.code === 'casino.no_game') board = null;
    coins.refresh().catch(() => {});
  }

  async function reload() {
    try {
      const info = await gameInfo<MinesInfo, MinesView>('mines');
      if (info.pending) {
        board = info.pending;
        last = null;
      }
    } catch {
      // The flash for the original error is already up.
    }
  }

  async function start(event: SubmitEvent, limits: Limits) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = limits.minBet;
    pending = true;
    try {
      const started = await minesStart(bet, mines);
      board = started.view;
      last = null;
      coins.set(started.balance);
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }

  async function reveal(i: number) {
    pending = true;
    try {
      const step = await minesReveal(i);
      if (isSettled(step)) settle(step);
      else board = step.view;
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }

  async function cashOut() {
    pending = true;
    try {
      settle(await minesCashout());
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }
</script>

<GameShell game="mines">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: Limits;
    info: MinesInfo;
    balance: number;
    blocked: boolean;
  })}
    {@const current = active(limits)}
    <section class="panel cs-game">
      {#if current}
        <form
          class="cs-form cs-controls"
          onsubmit={(e) => {
            e.preventDefault();
            cashOut();
          }}
        >
          <BetInput
            value={current.bet}
            min={limits.minBet}
            max={Math.max(limits.maxBet, current.bet)}
            balance={Math.max(balance, current.bet)}
            disabled
          />
          <p class="cs-field">{m.casino_mines_count({ count: current.count })}</p>
          <button class="btn cs-go cs-cash" type="submit" disabled={pending}>
            {m.casino_cash_out()}
            <span><i class="fa-solid fa-coins"></i>{number(payout(current))}</span>
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
          <label class="cs-field">
            {m.casino_mines_count({ count: mines })}
            <input type="range" min="1" max={info.grid - 1} bind:value={mines} disabled={pending} />
          </label>
          <button class="btn btn-blue cs-go" type="submit" disabled={pending || blocked}>
            {m.casino_play()}
          </button>
          {#if last}
            {#if last.result.cashedOut}
              <p class="cs-landed">{m.casino_cashed_out()}</p>
            {/if}
            <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
          {/if}
        </form>
      {/if}

      <div class="cs-stage">
        <div class="cs-stats" aria-live="polite">
          <b>{multiplier(current?.multiplier ?? last?.multiplier ?? 1)}</b>
          {#if current?.next}
            <span>{m.casino_next_tile()} {multiplier(current.next)}</span>
          {/if}
        </div>
        <div class="cs-mines" style="--cols: {Math.ceil(Math.sqrt(info.grid))}">
          {#each { length: info.grid }, i (i)}
            {@const face = tile(i, current)}
            <button
              type="button"
              class="cs-tile"
              class:safe={face === '💎'}
              class:mine={face === '💣'}
              class:hit={face === '💥'}
              class:open={!!current && !face}
              disabled={!current || !!face || pending}
              aria-label={current && !face ? `${m.casino_reveal()} ${i + 1}` : undefined}
              onclick={() => reveal(i)}
            >
              {face}
            </button>
          {/each}
        </div>
      </div>
    </section>
  {/snippet}
</GameShell>
