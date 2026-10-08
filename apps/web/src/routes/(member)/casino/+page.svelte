<script lang="ts">
  import { casino, type Game } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { gameBlurb, games, gameTitle } from '$lib/casino';
  import { coins } from '$lib/coins.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const icons: Record<Game, string> = {
    coinflip: 'fa-coins',
    plinko: 'fa-circle-nodes',
    slots: 'fa-sack-dollar',
    roulette: 'fa-circle-dot',
    wheel: 'fa-dharmachakra',
    bingo: 'fa-table-cells',
    chicken_road: 'fa-road',
    aviator: 'fa-plane',
    mines: 'fa-bomb',
    poker: 'fa-diamond',
    zeus: 'fa-bolt',
    blackjack: 'fa-clover'
  };

  const view = query((signal) => casino(signal));
  const data = $derived(view.state.status === 'ready' ? view.state.data : null);
  const cards = $derived(
    games.map((g) => ({ ...g, enabled: !!data?.games.find((c) => c.game === g.key)?.enabled }))
  );

  $effect(() => {
    if (data) coins.set(data.balance);
  });
</script>

<svelte:head><title>{m.casino_title()} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg"><h1>{m.casino_title()}</h1></Banner>

<main class="wrap cs">
  {#if data}
    <section class="panel cs-top">
      <b class="cs-balance">
        <i class="fa-solid fa-coins"></i>{m.casino_balance({
          count: data.balance,
          coins: number(data.balance)
        })}
      </b>
      <nav>
        <a href="/casino/history">
          <i class="fa-solid fa-clock-rotate-left"></i>{m.casino_history_title()}
        </a>
        <a href="/shop"><i class="fa-solid fa-store"></i>{m.casino_shop_link()}</a>
      </nav>
    </section>

    {#if data.restricted}
      <p class="cs-restricted">{m.common_error_forbidden()}</p>
    {/if}

    <section>
      <h2>{m.casino_games()}</h2>
      <ul class="cs-grid">
        {#each cards as card (card.key)}
          <li>
            {#if card.live && card.enabled}
              <a class="panel cs-card" href={card.route}>
                <i class="fa-solid {icons[card.key]}"></i>
                <b>{gameTitle(card.key)}</b>
                <small class="muted">{gameBlurb(card.key)}</small>
                <span class="cs-play">{m.casino_play()}</span>
              </a>
            {:else}
              <div class="panel cs-card off" aria-disabled="true">
                <i class="fa-solid {icons[card.key]}"></i>
                <b>{gameTitle(card.key)}</b>
                <small class="muted">{gameBlurb(card.key)}</small>
                <span class="cs-soon">
                  {card.live ? m.casino_err_disabled() : m.casino_coming_soon()}
                </span>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {:else if view.state.status === 'error'}
    <p class="muted">{describe(view.state.error)}</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 320px"></span></div>
  {/if}
</main>
