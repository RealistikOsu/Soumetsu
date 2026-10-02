<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    countries,
    leaderboard,
    PAGE_SIZE,
    type LeaderboardEntry,
    type LeaderboardSort
  } from '$lib/api/leaderboard';
  import { query } from '$lib/api/query.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import ModeTabs from '$lib/components/ModeTabs.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import RelaxTabs from '$lib/components/RelaxTabs.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Username from '$lib/components/Username.svelte';
  import { number } from '$lib/format';
  import { allowed, modeSlugs, relaxSlugs, slideTowards } from '$lib/modes';

  const sorts: { key: LeaderboardSort; label: string; heading: string }[] = [
    { key: 'pp', label: 'PP', heading: 'Performance' },
    { key: 'score', label: 'Score', heading: 'Ranked score' },
    { key: 'coins', label: 'Coins', heading: 'Coins' }
  ];

  const view = $derived.by(() => {
    const q = page.url.searchParams;
    const rx = Math.max(0, relaxSlugs.indexOf(q.get('rx') ?? ''));
    const mode = Math.max(0, modeSlugs.indexOf(q.get('m') ?? ''));
    const sort = sorts.find((s) => s.key === q.get('sort'))?.key ?? 'pp';
    return {
      rx,
      mode: allowed(mode, rx) ? mode : 0,
      sort,
      page: Math.max(1, parseInt(q.get('p') ?? '') || 1),
      country: (q.get('c') ?? '').toUpperCase()
    };
  });

  const heading = $derived(sorts.find((s) => s.key === view.sort)!.heading);

  function go(next: Partial<typeof view>, resetPage = true) {
    const merged = { ...view, ...next, page: resetPage ? 1 : (next.page ?? view.page) };
    if (!allowed(merged.mode, merged.rx)) merged.mode = 0;
    slideTowards(view, merged);
    const q = new URLSearchParams({
      m: modeSlugs[merged.mode],
      rx: relaxSlugs[merged.rx],
      sort: merged.sort,
      p: String(merged.page),
      c: merged.country
    });
    goto(`?${q}`, { replaceState: true, keepFocus: true, noScroll: true });
  }

  let rows = $state.raw<LeaderboardEntry[] | null>([]);
  let loading = $state(true);
  let skeleton = $state(false);
  let generation = $state(0);

  $effect(() => {
    const current = $state.snapshot(view);
    const controller = new AbortController();
    loading = true;
    const timer = setTimeout(() => (skeleton = true), 120);
    leaderboard(current, controller.signal).then(
      (result) => {
        rows = result;
        done();
      },
      () => {
        if (controller.signal.aborted) return;
        rows = null;
        done();
      }
    );
    function done() {
      if (controller.signal.aborted) return;
      clearTimeout(timer);
      loading = false;
      skeleton = false;
      generation++;
    }
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  });

  const top = query((signal) => countries(11, signal));
  let allCountries = $state.raw<string[] | null>(null);
  let chooser = $state(false);
  const names = new Intl.DisplayNames(['en'], { type: 'region' });

  async function openChooser() {
    chooser = true;
    allCountries ??= await countries(500).catch(() => []);
  }

  const widths = [96, 140, 80, 120, 104, 150, 88, 132, 112, 76, 124, 100];
  const offset = $derived((view.page - 1) * PAGE_SIZE);
</script>

<svelte:head>
  <title>Leaderboard · RealistikOsu</title>
</svelte:head>

<Banner image="leaderboard.jpg"><h1>Leaderboard</h1></Banner>

<main class="wrap leaderboard" class:is-coins={view.sort === 'coins'} class:is-loading={loading}>
  <div class="filters">
    <nav class="tabs tinted sort-tabs" use:tabInk>
      {#each sorts as sort (sort.key)}
        <a
          class="c-blue {sort.key === view.sort ? 'active' : ''}"
          href="?sort={sort.key}"
          onclick={(event) => {
            event.preventDefault();
            go({ sort: sort.key });
          }}
        >
          {sort.label}
        </a>
      {/each}
    </nav>
    <RelaxTabs rx={view.rx} onselect={(rx) => go({ rx })} />
    <div class="modes">
      <ModeTabs mode={view.mode} rx={view.rx} onselect={(mode) => go({ mode })} />
    </div>
  </div>

  <nav class="countries">
    <a
      class:active={view.country === ''}
      href="?c="
      onclick={(event) => {
        event.preventDefault();
        go({ country: '' });
      }}
    >
      All
    </a>
    {#each top.state.status === 'ready' ? top.state.data : [] as country (country)}
      <a
        class:active={view.country === country}
        href="?c={country}"
        onclick={(event) => {
          event.preventDefault();
          go({ country });
        }}
      >
        <Flag {country} />
      </a>
    {/each}
    <a
      href="#countries"
      title="More countries"
      onclick={(event) => {
        event.preventDefault();
        openChooser();
      }}
    >
      ...
    </a>
  </nav>

  <table class="board c-yellow">
    <thead>
      <tr>
        <th class="rank">Rank</th>
        <th class="player">Player</th>
        <th class="value-head">{heading}</th>
        <th class="stat">Accuracy</th>
        <th class="stat hide-sm">Playcount</th>
      </tr>
    </thead>
    <tbody class="swap">
      {#if skeleton}
        {#each widths as width, i (i)}
          <tr class="skel-row" aria-hidden="true">
            <td class="rank"><span class="skel" style="width: 26px"></span></td>
            <td class="player">
              <span class="skel-line">
                <span class="skel-avatar"></span><span class="skel" style="width: {width}px"></span>
              </span>
            </td>
            <td class="pp"><span class="skel" style="width: 64px"></span></td>
            <td class="stat"><span class="skel" style="width: 48px"></span></td>
            <td class="stat hide-sm"><span class="skel" style="width: 40px"></span></td>
          </tr>
        {/each}
      {:else}
        {#key generation}
          {#each rows ?? [] as user, i (user.id)}
            {@const rank = offset + i + 1}
            <tr
              class:place-1={rank === 1}
              class:place-2={rank === 2}
              class:place-3={rank === 3}
              style="--n: {Math.min(i, 14)}"
            >
              <td class="rank">#{rank}</td>
              <td class="player">
                <a href="/users/{user.id}">
                  <Flag country={user.country} /><Avatar id={user.id} /><Username
                    id={user.id}
                    name={user.username}
                  />
                </a>
              </td>
              <td class="pp">
                {#if view.sort === 'pp'}
                  {number(user.chosen_mode.pp)}pp
                {:else if view.sort === 'score'}
                  {number(user.chosen_mode.ranked_score)}
                {:else}
                  {number(user.coins)}
                {/if}
              </td>
              {#if view.sort !== 'coins'}
                <td class="dim">{number(user.chosen_mode.accuracy, 2)}%</td>
                <td class="dim hide-sm">{number(user.chosen_mode.playcount)}</td>
              {/if}
            </tr>
          {/each}
        {/key}
      {/if}
    </tbody>
  </table>
  <p class="board-empty" hidden={loading || (rows !== null && rows.length > 0)}>
    {rows ? 'Nobody here yet.' : "Couldn't load the leaderboard. Try again in a bit."}
  </p>

  <Pager
    page={view.page}
    hasNext={!!rows && rows.length === PAGE_SIZE}
    onpage={(p) => go({ page: p }, false)}
  />
</main>

<Dialog bind:open={chooser} class="country-dialog">
  <button class="dialog-close" aria-label="Close" onclick={() => (chooser = false)}>
    <i class="fa-solid fa-xmark"></i>
  </button>
  <h2>Pick a country</h2>
  <div class="country-grid">
    {#each allCountries ?? [] as country (country)}
      <a
        href="?c={country}"
        onclick={(event) => {
          event.preventDefault();
          chooser = false;
          go({ country });
        }}
      >
        <Flag {country} />{names.of(country) ?? country}
      </a>
    {/each}
  </div>
</Dialog>
