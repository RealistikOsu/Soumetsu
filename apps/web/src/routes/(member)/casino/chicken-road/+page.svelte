<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    chickenCashout,
    chickenStart,
    chickenStep,
    gameInfo,
    isSettled,
    type ChickenInfo,
    type ChickenResult,
    type ChickenView,
    type GameInfo,
    type Settled
  } from '$lib/api/casino';
  import { isApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { multiplier, payoutPreview, wait } from '$lib/casino';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { number } from '$lib/format';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Limits = GameInfo<ChickenInfo, ChickenView>;
  type Play = { bet: number; payout: number; multiplier: number; result: ChickenResult };

  const TRUCK = 600;

  let bet = $state(100);
  let pending = $state(false);
  // undefined until the page has acted, so the server's pending run shows on load.
  let run = $state.raw<ChickenView | null | undefined>(undefined);
  let last = $state.raw<Play | null>(null);
  // The lane a truck is driving through, before the crash lands.
  let truck = $state<number | null>(null);
  const leaving = new AbortController();
  onDestroy(() => leaving.abort());

  const active = (limits: Limits) => (run === undefined ? (limits.pending ?? null) : run);

  // Lanes count from 1; 0 is the kerb the chicken starts on.
  const position = (current: ChickenView | null) =>
    truck ?? current?.step ?? (last ? (last.result.crashedAt ?? last.result.steps) : 0);

  function settle(play: Settled<ChickenView, ChickenResult>) {
    run = null;
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
    else if (isApiError(error) && error.code === 'casino.no_game') run = null;
    coins.refresh().catch(() => {});
  }

  async function reload() {
    try {
      const info = await gameInfo<ChickenInfo, ChickenView>('chicken_road');
      if (info.pending) {
        run = info.pending;
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
      const started = await chickenStart(bet);
      run = started.view;
      last = null;
      coins.set(started.balance);
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }

  async function step() {
    pending = true;
    try {
      const next = await chickenStep();
      if (isSettled(next)) {
        const crashed = next.result.crashedAt;
        if (crashed && ms(TRUCK)) {
          truck = crashed;
          await wait(ms(TRUCK), leaving.signal);
          truck = null;
          if (leaving.signal.aborted) {
            coins.set(next.balance);
            return;
          }
        }
        settle(next);
      } else {
        run = next.view;
      }
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }

  async function cashOut() {
    pending = true;
    try {
      settle(await chickenCashout());
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }
</script>

<GameShell game="chicken_road">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: Limits;
    info: ChickenInfo;
    balance: number;
    blocked: boolean;
  })}
    {@const current = active(limits)}
    {@const at = position(current)}
    {@const crashed = truck === null ? last?.result.crashedAt : undefined}
    <section class="panel cs-game cs-wide">
      {#if current}
        <form
          class="cs-form cs-controls"
          onsubmit={(e) => {
            e.preventDefault();
            step();
          }}
        >
          <BetInput
            value={current.bet}
            min={limits.minBet}
            max={Math.max(limits.maxBet, current.bet)}
            balance={Math.max(balance, current.bet)}
            disabled
          />
          <button class="btn btn-blue cs-go" type="submit" disabled={pending}>
            {m.casino_step()}
            {#if current.next}{multiplier(current.next)}{/if}
          </button>
          <button class="btn cs-go cs-cash" type="button" disabled={pending} onclick={cashOut}>
            {m.casino_cash_out()}
            <span
              ><i class="fa-solid fa-coins"></i>{number(
                payoutPreview(current.bet, current.multiplier)
              )}</span
            >
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
            {m.casino_play()}
          </button>
          {#if last}
            <p class="cs-landed">
              {last.result.crashedAt ? m.casino_crashed() : m.casino_cashed_out()}
            </p>
            <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
          {/if}
        </form>
      {/if}

      <div class="cs-stage">
        <div class="cs-stats" aria-live="polite">
          {#if current || last}
            <b>{multiplier(current?.multiplier ?? last?.multiplier ?? 1)}</b>
          {/if}
        </div>
        <div class="cs-road" style="--truck: {ms(TRUCK)}ms">
          <div class="cs-kerb">
            {#if at === 0}<span class="cs-chicken">🐔</span>{/if}
          </div>
          {#each info.multipliers as value, i (i)}
            {@const lane = i + 1}
            <button
              type="button"
              class="cs-lane"
              class:passed={lane < at || (lane === at && !crashed && truck === null)}
              class:next={!!current && lane === at + 1}
              class:crashed={lane === crashed}
              disabled={!current || lane !== at + 1 || pending}
              onclick={step}
            >
              <span class="cs-bubble">{multiplier(value)}</span>
              {#if lane === truck}
                <span class="cs-truck">🚚</span>
              {/if}
              {#if lane === at}
                <span class="cs-chicken">{lane === crashed ? '💥' : '🐔'}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </section>
  {/snippet}
</GameShell>
