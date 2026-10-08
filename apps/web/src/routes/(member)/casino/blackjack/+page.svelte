<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    blackjackDouble,
    blackjackHit,
    blackjackStand,
    blackjackStart,
    gameInfo,
    isSettled,
    type BlackjackInfo,
    type BlackjackOutcome,
    type BlackjackResult,
    type BlackjackView,
    type Card,
    type GameInfo,
    type Settled
  } from '$lib/api/casino';
  import { isApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { wait } from '$lib/casino';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Limits = GameInfo<BlackjackInfo, BlackjackView>;
  type Play = { bet: number; payout: number; multiplier: number; result: BlackjackResult };
  type Delays = { player: number[]; dealer: number[] };

  const STAGGER = 150;
  const FLIP = 300;

  const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const FACES: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  const face = (card: Card) => FACES[card.rank] ?? String(card.rank);
  const value = (card: Card) => (card.rank === 1 ? 11 : Math.min(card.rank, 10));

  const outcomes: Record<BlackjackOutcome, () => string> = {
    blackjack: m.casino_bj_blackjack,
    win: m.casino_bj_win,
    dealer_bust: m.casino_bj_dealer_bust,
    lose: m.casino_bj_lose,
    bust: m.casino_bj_bust
  };

  let bet = $state(100);
  let pending = $state(false);
  // undefined until the page has acted, so the server's pending hand shows on load.
  let table = $state.raw<BlackjackView | null | undefined>(undefined);
  let last = $state.raw<Play | null>(null);
  // True while the dealer's cards land, so the outcome waits for them.
  let landing = $state(false);
  // Bumped on every deal so fresh cards remount and replay their entrance.
  let round = $state(0);
  let delays = $state.raw<Delays>({ player: [], dealer: [] });
  const leaving = new AbortController();
  onDestroy(() => leaving.abort());

  const active = (limits: Limits) => (table === undefined ? (limits.pending ?? null) : table);

  // Deal order is player, dealer, player, dealer.
  const dealt = (player: number, dealer: number): Delays => ({
    player: Array.from({ length: player }, (_, i) => ms(STAGGER) * i * 2),
    dealer: Array.from({ length: dealer }, (_, i) => ms(STAGGER) * (i * 2 + 1))
  });

  async function settle(play: Settled<BlackjackView, BlackjackResult>, fresh = false) {
    const dealer = play.result.dealer.length;
    delays = fresh
      ? dealt(play.result.player.length, dealer)
      : {
          player: play.result.player.map(() => 0),
          dealer: play.result.dealer.map((_, i) => (i < 2 ? 0 : ms(STAGGER) * (i - 1)))
        };
    table = null;
    last = {
      bet: play.view.bet,
      payout: play.payout,
      multiplier: play.multiplier,
      result: play.result
    };
    landing = true;
    const lastDelay = fresh ? dealt(0, dealer).dealer[dealer - 1] : ms(STAGGER) * (dealer - 2);
    await wait(Math.max(lastDelay, 0) + ms(FLIP), leaving.signal);
    landing = false;
    coins.set(play.balance);
  }

  async function failed(error: unknown) {
    flash.show('error', describe(error));
    if (isApiError(error) && error.code === 'casino.game_pending') await reload();
    else if (isApiError(error) && error.code === 'casino.no_game') table = null;
    coins.refresh().catch(() => {});
  }

  async function reload() {
    try {
      const info = await gameInfo<BlackjackInfo, BlackjackView>('blackjack');
      if (info.pending) {
        round++;
        delays = { player: [], dealer: [] };
        table = info.pending;
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
      const step = await blackjackStart(bet);
      round++;
      if (isSettled(step)) await settle(step, true);
      else {
        delays = dealt(step.view.player.length, 2);
        table = step.view;
        last = null;
        coins.set(step.balance);
      }
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }

  async function act(move: 'hit' | 'stand' | 'double') {
    pending = true;
    try {
      if (move === 'hit') {
        const step = await blackjackHit();
        if (isSettled(step)) await settle(step);
        else {
          delays = { player: step.view.player.map(() => 0), dealer: [0, 0] };
          table = step.view;
        }
      } else {
        await settle(await (move === 'stand' ? blackjackStand() : blackjackDouble()));
      }
    } catch (error) {
      await failed(error);
    }
    pending = false;
  }
</script>

{#snippet hand(cards: Card[], side: 'player' | 'dealer', hole: boolean)}
  <div class="cs-bj-cards">
    {#each cards as card, i (`${round}-${side}-${i}-${card.rank}${card.suit}`)}
      <div
        class="cs-playing"
        class:red={card.suit === 'H' || card.suit === 'D'}
        style="animation-delay: {delays[side][i] ?? 0}ms"
      >
        <b>{face(card)}</b>
        <span>{SUITS[card.suit]}</span>
      </div>
    {/each}
    {#if hole}
      <div class="cs-playing back hole" style="animation-delay: {delays.dealer[1] ?? 0}ms"></div>
    {/if}
    {#if !cards.length}
      <div class="cs-playing back"></div>
      <div class="cs-playing back"></div>
    {/if}
  </div>
{/snippet}

<GameShell game="blackjack">
  {#snippet children({
    limits,
    balance,
    blocked
  }: {
    limits: Limits;
    info: BlackjackInfo;
    balance: number;
    blocked: boolean;
  })}
    {@const current = active(limits)}
    {@const shown = landing ? null : last}
    <section class="panel cs-game">
      {#if current}
        <form class="cs-form cs-controls" onsubmit={(e) => e.preventDefault()}>
          <BetInput
            value={current.bet}
            min={limits.minBet}
            max={Math.max(limits.maxBet, current.bet)}
            balance={Math.max(balance, current.bet)}
            disabled
          />
          <div class="cs-bj-moves">
            <button
              class="btn btn-blue"
              type="button"
              disabled={pending}
              onclick={() => act('hit')}
            >
              {m.casino_hit()}
            </button>
            <button class="btn" type="button" disabled={pending} onclick={() => act('stand')}>
              {m.casino_stand()}
            </button>
            <button
              class="btn"
              type="button"
              disabled={pending || !current.canDouble || balance < current.bet}
              onclick={() => act('double')}
            >
              {m.casino_double()}
            </button>
          </div>
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
            {m.casino_deal()}
          </button>
          {#if shown}
            <PlayResult bet={shown.bet} payout={shown.payout} multiplier={shown.multiplier} />
          {/if}
        </form>
      {/if}

      <div class="cs-stage">
        <div class="cs-bj">
          <div class="cs-bj-side">
            <h2>
              {m.casino_dealer()}
              {#if current || last}
                <b class="cs-bj-score">
                  {current?.dealerScore ??
                    (landing && last ? value(last.result.dealer[0]) : last?.result.dealerScore)}
                </b>
              {/if}
            </h2>
            {@render hand(current?.dealer ?? last?.result.dealer ?? [], 'dealer', !!current)}
          </div>

          <p
            class="cs-bj-banner"
            class:win={shown && shown.payout > shown.bet}
            class:loss={shown && shown.payout < shown.bet}
            aria-live="polite"
          >
            {#if shown}{outcomes[shown.result.outcome]()}{/if}
          </p>

          <div class="cs-bj-side">
            {@render hand(current?.player ?? last?.result.player ?? [], 'player', false)}
            <h2>
              {m.casino_you()}
              {#if current || last}
                <b class="cs-bj-score">{current?.playerScore ?? last?.result.playerScore}</b>
              {/if}
            </h2>
          </div>
        </div>
      </div>
    </section>
  {/snippet}
</GameShell>
