<script lang="ts">
  import { casino, playCoinflip, type CoinflipPlay } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { coins } from '$lib/coins.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import { flash } from '$lib/flash.svelte';
  import { number } from '$lib/format';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Side = 'heads' | 'tails';

  const view = query((signal) => casino(signal));
  const data = $derived(view.state.status === 'ready' ? view.state.data : null);
  const limits = $derived(data?.games.find((g) => g.game === 'coinflip') ?? null);
  const balance = $derived(coins.balance ?? data?.balance ?? 0);

  let bet = $state(100);
  let choice = $state<Side>('heads');
  let pending = $state(false);
  let last = $state.raw<(CoinflipPlay & { bet: number }) | null>(null);

  const face = $derived<Side>(last?.result.outcome ?? choice);

  $effect(() => {
    if (data) coins.set(data.balance);
  });

  const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

  async function flip(event: SubmitEvent) {
    event.preventDefault();
    pending = true;
    last = null;
    const placed = bet;
    try {
      // The coin keeps spinning for at least a second even when the server answers sooner.
      const [play] = await Promise.all([playCoinflip(placed, choice), wait(ms(1000))]);
      last = { ...play, bet: placed };
      coins.set(play.balance);
    } catch (error) {
      flash.show('error', describe(error));
    }
    pending = false;
  }
</script>

<svelte:head><title>{m.casino_coinflip_title()} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg"><h1>{m.casino_coinflip_title()}</h1></Banner>

<main class="wrap cs">
  <a class="cs-back" href="/casino"><i class="fa-solid fa-arrow-left"></i>{m.casino_title()}</a>
  {#if data && limits}
    <section class="panel cs-flip">
      <b class="cs-balance">
        <i class="fa-solid fa-coins"></i>{m.casino_balance({
          count: balance,
          coins: number(balance)
        })}
      </b>

      {#if data.restricted}
        <p class="cs-restricted">{m.common_error_forbidden()}</p>
      {:else if !limits.enabled}
        <p class="cs-restricted">{m.casino_err_disabled()}</p>
      {/if}

      <div class="cs-coin" class:spinning={pending} class:tails={face === 'tails'}>
        <span class="cs-face heads">{m.casino_heads()}</span>
        <span class="cs-face tails">{m.casino_tails()}</span>
      </div>

      <div class="cs-result" aria-live="polite">
        {#if last}
          {#if last.result.won}
            <b class="win">{m.casino_won({ count: last.payout, coins: number(last.payout) })}</b>
          {:else}
            <b class="loss">{m.casino_lost({ count: last.bet, coins: number(last.bet) })}</b>
          {/if}
        {:else if pending}
          <span class="muted">{m.casino_flipping()}</span>
        {/if}
      </div>

      <form class="cs-form" onsubmit={flip}>
        <BetInput
          bind:value={bet}
          min={limits.minBet}
          max={limits.maxBet}
          {balance}
          disabled={pending}
        />
        <div class="cs-sides" role="radiogroup" aria-label={m.casino_coinflip_title()}>
          {#each ['heads', 'tails'] as const as side (side)}
            <button
              type="button"
              role="radio"
              aria-checked={choice === side}
              class:active={choice === side}
              disabled={pending}
              onclick={() => (choice = side)}
            >
              {side === 'heads' ? m.casino_heads() : m.casino_tails()}
            </button>
          {/each}
        </div>
        <button
          class="btn btn-blue cs-go"
          type="submit"
          disabled={pending || data.restricted || !limits.enabled}
        >
          {pending ? m.casino_flipping() : m.casino_flip()}
        </button>
      </form>
    </section>
  {:else if view.state.status === 'error'}
    <p class="muted">{describe(view.state.error)}</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 320px"></span></div>
  {/if}
</main>
