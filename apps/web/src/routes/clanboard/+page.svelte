<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { CLANBOARD_PAGE_SIZE, clanLeaderboard, type ClanRanking } from '$lib/api/clans';
  import { session } from '$lib/auth/session.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import ClanBadge from '$lib/components/ClanBadge.svelte';
  import ModeTabs from '$lib/components/ModeTabs.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import RelaxTabs from '$lib/components/RelaxTabs.svelte';
  import { number } from '$lib/format';
  import { readMode, slideTowards, allowed } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';

  const view = $derived({
    ...readMode(page.url.searchParams),
    page: Math.max(1, parseInt(page.url.searchParams.get('p') ?? '') || 1)
  });

  function go(next: Partial<typeof view>, keepPage = false) {
    const merged = { ...view, ...next, page: keepPage ? (next.page ?? view.page) : 1 };
    if (!allowed(merged.mode, merged.rx)) merged.mode = 0;
    slideTowards(view, merged);
    goto(`?mode=${merged.mode}&rx=${merged.rx}&p=${merged.page}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }

  let rows = $state.raw<ClanRanking[] | null>([]);
  let loading = $state(true);

  $effect(() => {
    const current = $state.snapshot(view);
    const controller = new AbortController();
    loading = true;
    clanLeaderboard(current.mode, current.rx, current.page, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        rows = result;
        loading = false;
      },
      () => {
        if (controller.signal.aborted) return;
        rows = null;
        loading = false;
      }
    );
    return () => controller.abort();
  });

  const offset = $derived((view.page - 1) * CLANBOARD_PAGE_SIZE);
</script>

<svelte:head><title>{m.leaderboard_clans_title()} · RealistikOsu</title></svelte:head>

<Banner image="clans.jpg"><h1>{m.leaderboard_clans_title()}</h1></Banner>

<main class="wrap">
  <div class="filters mode-switch">
    <RelaxTabs mode={view.mode} rx={view.rx} onselect={(rx) => go({ rx })} />
    {#if session.user && !session.user.clan}
      <a class="btn btn-blue create-clan" href="/clans/create">
        <i class="fa-solid fa-plus"></i>{m.leaderboard_clans_create()}
      </a>
    {/if}
    <div class="modes">
      <ModeTabs mode={view.mode} rx={view.rx} onselect={(mode) => go({ mode })} />
    </div>
  </div>

  <table class="board c-purple">
    <thead>
      <tr>
        <th class="rank">{m.leaderboard_col_rank()}</th>
        <th class="player">{m.leaderboard_clans_col_clan()}</th>
        <th>{m.leaderboard_clans_col_performance()}</th>
        <th class="hide-sm">{m.leaderboard_clans_col_total_score()}</th>
        <th>{m.leaderboard_col_playcount()}</th>
      </tr>
    </thead>
    <tbody class="swap">
      {#each rows ?? [] as clan, i (clan.id)}
        {@const rank = offset + i + 1}
        <tr
          class:place-1={rank === 1}
          class:place-2={rank === 2}
          class:place-3={rank === 3}
          style="--n: {Math.min(i, 14)}"
        >
          <td class="rank">#{rank}</td>
          <td class="player">
            <a href="/c/{clan.id}">
              <ClanBadge id={clan.id} tag={clan.tag} size="small" /><span class="clan"
                >[{clan.tag.trim()}]</span
              ><b>{clan.name}</b>
            </a>
          </td>
          <td class="pp">{number(clan.chosen_mode.pp)}pp</td>
          <td class="dim hide-sm">{number(clan.chosen_mode.total_score)}</td>
          <td class="dim">{number(clan.chosen_mode.playcount)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if !loading && (rows === null || rows.length === 0)}
    <p class="board-empty">
      {rows ? m.leaderboard_clans_empty() : m.leaderboard_clans_error()}
    </p>
  {/if}

  <Pager
    page={view.page}
    hasNext={!!rows && rows.length === CLANBOARD_PAGE_SIZE}
    onpage={(p) => go({ page: p }, true)}
  />
</main>
