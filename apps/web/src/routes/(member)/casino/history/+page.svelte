<script lang="ts">
  import { casinoHistory } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { gameTitle } from '$lib/casino';
  import Banner from '$lib/components/Banner.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { dateTime, fromIso, number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let pageNo = $state(1);
  const history = query((signal) => casinoHistory(pageNo, signal));

  const signed = (n: number) => (n > 0 ? `+${number(n)}` : number(n));
</script>

<svelte:head><title>{m.casino_history_title()} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg"><h1>{m.casino_history_title()}</h1></Banner>

<main class="wrap cs">
  <a class="cs-back" href="/casino"><i class="fa-solid fa-arrow-left"></i>{m.casino_title()}</a>
  {#if history.state.status === 'ready'}
    {@const data = history.state.data}
    {#if data.rows.length}
      <ul class="panel cs-history">
        {#each data.rows as row (row.id)}
          <li>
            <b>{gameTitle(row.game)}</b>
            <span class="muted">{dateTime(fromIso(row.playedAt))}</span>
            <span>{m.casino_bet()}: {number(row.bet)}</span>
            <span class="cs-net" class:win={row.net > 0} class:loss={row.net < 0}>
              {signed(row.net)}
            </span>
          </li>
        {/each}
      </ul>
      {#if data.total > data.pageSize}
        <Pager
          page={pageNo}
          pages={Math.ceil(data.total / data.pageSize)}
          hasNext={pageNo * data.pageSize < data.total}
          onpage={(p) => (pageNo = p)}
        />
      {/if}
    {:else}
      <p class="muted">{m.casino_history_empty()}</p>
    {/if}
  {:else if history.state.status === 'error'}
    <p class="muted">{describe(history.state.error)}</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 320px"></span></div>
  {/if}
</main>
