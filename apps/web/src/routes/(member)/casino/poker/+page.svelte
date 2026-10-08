<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    gameInfo,
    pokerDeal,
    pokerDraw,
    type Card,
    type GameInfo,
    type HandRank,
    type PokerInfo
  } from '$lib/api/casino';
  import { isApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import { multiplier, wait } from '$lib/casino';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Hand = { cards: Card[]; bet: number };
  type Play = { bet: number; payout: number; multiplier: number; rank: HandRank };

  const STAGGER = 120;
  const FLIP = 300;

  const RANKS: HandRank[] = [
    'royal_flush',
    'straight_flush',
    'four_of_a_kind',
    'full_house',
    'flush',
    'straight',
    'three_of_a_kind',
    'two_pair',
    'jacks_or_better'
  ];

  const handNames: Record<HandRank, () => string> = {
    royal_flush: m.casino_hand_royal_flush,
    straight_flush: m.casino_hand_straight_flush,
    four_of_a_kind: m.casino_hand_four_of_a_kind,
    full_house: m.casino_hand_full_house,
    flush: m.casino_hand_flush,
    straight: m.casino_hand_straight,
    three_of_a_kind: m.casino_hand_three_of_a_kind,
    two_pair: m.casino_hand_two_pair,
    jacks_or_better: m.casino_hand_jacks_or_better,
    nothing: m.casino_hand_nothing
  };

  const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const FACES: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  const face = (card: Card) => FACES[card.rank] ?? String(card.rank);

  let bet = $state(100);
  let pending = $state(false);
  // undefined until the page has acted, so the server's pending hand shows on load.
  let hand = $state.raw<Hand | null | undefined>(undefined);
  let shown = $state.raw<Card[]>([]);
  let held = $state([false, false, false, false, false]);
  // Bumped on every deal so fresh cards remount and replay their entrance.
  let round = $state(0);
  let delays = $state.raw<number[]>([0, 0, 0, 0, 0]);
  let last = $state.raw<Play | null>(null);
  const leaving = new AbortController();
  onDestroy(() => leaving.abort());

  const active = (limits: GameInfo<PokerInfo>): Hand | null =>
    hand === undefined
      ? limits.pending
        ? { cards: limits.pending.hand, bet: limits.pending.bet }
        : null
      : hand;

  const cards = (limits: GameInfo<PokerInfo>) => {
    const current = active(limits);
    return current && hand === undefined ? current.cards : shown;
  };

  function show(next: Hand) {
    hand = next;
    shown = next.cards;
    held = [false, false, false, false, false];
    last = null;
  }

  async function deal(event: SubmitEvent, limits: GameInfo<PokerInfo>) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = limits.minBet;
    pending = true;
    try {
      const dealt = await pokerDeal(bet);
      round++;
      delays = [0, 1, 2, 3, 4].map((i) => i * ms(STAGGER));
      show({ cards: dealt.hand, bet: dealt.bet });
      coins.set(dealt.balance);
    } catch (error) {
      flash.show('error', describe(error));
      if (isApiError(error) && error.code === 'casino.hand_pending') await reload();
      else coins.refresh().catch(() => {});
    }
    pending = false;
  }

  async function reload() {
    try {
      const info = await gameInfo<PokerInfo>('poker');
      if (info.pending) {
        round++;
        delays = [0, 0, 0, 0, 0];
        show({ cards: info.pending.hand, bet: info.pending.bet });
      }
    } catch {
      // The flash for the original error is already up.
    }
  }

  async function draw(current: Hand) {
    pending = true;
    const keep = [...held];
    try {
      const play = await pokerDraw(keep);
      let order = 0;
      delays = keep.map((kept) => (kept ? 0 : order++ * ms(STAGGER)));
      shown = play.result.hand;
      hand = null;
      await wait(order ? ms(STAGGER) * (order - 1) + ms(FLIP) : 0, leaving.signal);
      last = {
        bet: current.bet,
        payout: play.payout,
        multiplier: play.multiplier,
        rank: play.result.handRank
      };
      coins.set(play.balance);
    } catch (error) {
      flash.show('error', describe(error));
      if (isApiError(error) && error.code === 'casino.no_hand') hand = null;
      coins.refresh().catch(() => {});
    }
    pending = false;
  }
</script>

<GameShell game="poker">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: GameInfo<PokerInfo>;
    info: PokerInfo;
    balance: number;
    blocked: boolean;
  })}
    {@const current = active(limits)}
    {@const visible = cards(limits)}
    <section class="panel cs-game">
      {#if current}
        <form
          class="cs-form cs-controls"
          onsubmit={(e) => {
            e.preventDefault();
            draw(current);
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
            {m.casino_draw()}
          </button>
        </form>
      {:else}
        <form class="cs-form cs-controls" onsubmit={(e) => deal(e, limits)}>
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
          {#if last}
            <p class="cs-landed">{handNames[last.rank]()}</p>
            <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
          {/if}
        </form>
      {/if}

      <div class="cs-stage">
        <div class="cs-hand">
          {#if visible.length}
            {#each visible as card, i (`${round}-${i}-${card.rank}${card.suit}`)}
              {@const red = card.suit === 'H' || card.suit === 'D'}
              {#if current}
                <button
                  type="button"
                  class="cs-playing"
                  class:red
                  class:held={held[i]}
                  style="animation-delay: {delays[i]}ms"
                  aria-pressed={held[i]}
                  disabled={pending}
                  onclick={() => (held[i] = !held[i])}
                >
                  <b>{face(card)}</b>
                  <span>{SUITS[card.suit]}</span>
                  <small>{held[i] ? m.casino_held() : m.casino_hold()}</small>
                </button>
              {:else}
                <div class="cs-playing" class:red style="animation-delay: {delays[i]}ms">
                  <b>{face(card)}</b>
                  <span>{SUITS[card.suit]}</span>
                </div>
              {/if}
            {/each}
          {:else}
            {#each [0, 1, 2, 3, 4] as i (i)}
              <div class="cs-playing back"></div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="cs-paytable">
        <h2>{m.casino_paytable()}</h2>
        <table>
          <tbody>
            {#each RANKS as rank (rank)}
              <tr class:hit={last?.rank === rank}>
                <td>{handNames[rank]()}</td>
                <td>{multiplier(info.payouts[rank] ?? 0)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/snippet}
</GameShell>
