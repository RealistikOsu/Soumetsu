<script lang="ts" generics="I">
  import type { Snippet } from 'svelte';
  import { casino, gameInfo, type Game, type GameInfo } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { gameTitle } from '$lib/casino';
  import { coins } from '$lib/coins.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let {
    game,
    children
  }: {
    game: Game;
    children: Snippet<[{ limits: GameInfo<I>; info: I; balance: number; blocked: boolean }]>;
  } = $props();

  const view = query((signal) => casino(signal));
  const details = query((signal) => gameInfo<I>(game, signal));
  const data = $derived(view.state.status === 'ready' ? view.state.data : null);
  const limits = $derived(details.state.status === 'ready' ? details.state.data : null);
  const balance = $derived(coins.balance ?? data?.balance ?? 0);
  const failure = $derived(
    view.state.status === 'error'
      ? view.state.error
      : details.state.status === 'error'
        ? details.state.error
        : null
  );

  $effect(() => {
    if (data) coins.set(data.balance);
  });
</script>

<svelte:head><title>{gameTitle(game)} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg"><h1>{gameTitle(game)}</h1></Banner>

<main class="wrap cs">
  <a class="cs-back" href="/casino"><i class="fa-solid fa-arrow-left"></i>{m.casino_title()}</a>
  {#if data && limits}
    <b class="cs-balance">
      <i class="fa-solid fa-coins"></i>{m.casino_balance({
        count: balance,
        coins: number(balance)
      })}
    </b>

    {#if data.restricted}
      <p class="cs-restricted">{m.common_error_forbidden()}</p>
    {:else if !limits.enabled || !limits.info}
      <p class="cs-restricted">{m.casino_err_disabled()}</p>
    {/if}

    {#if limits.info}
      {@render children({
        limits,
        info: limits.info,
        balance,
        blocked: data.restricted || !limits.enabled || balance < limits.minBet
      })}
    {/if}
  {:else if failure}
    <p class="muted">{describe(failure)}</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 420px"></span></div>
  {/if}
</main>
