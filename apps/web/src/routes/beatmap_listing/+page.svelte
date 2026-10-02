<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { searchSets, type SearchedSet } from '$lib/api/mirror';
  import { coverUrl, downloadUrl, isServerOnlySet, mirrors } from '$lib/assets';
  import { mirrorStatusOf, starColour } from '$lib/beatmaps';
  import Banner from '$lib/components/Banner.svelte';
  import Preview from '$lib/components/Preview.svelte';
  import { length } from '$lib/format';
  import { modeNames } from '$lib/modes';

  const PAGE_SIZE = 24;
  const statuses = [
    { name: 'Any', code: '' },
    { name: 'Ranked', code: '1' },
    { name: 'Qualified', code: '3' },
    { name: 'Loved', code: '4' },
    { name: 'Pending', code: '0' },
    { name: 'WIP', code: '-1' },
    { name: 'Graveyard', code: '-2' }
  ];

  let text = $state('');
  let mode = $state('0');
  let status = $state('1');
  let sets = $state.raw<SearchedSet[]>([]);
  let offset = $state(0);
  let loading = $state(true);
  let failed = $state(false);
  let more = $state(false);
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout>;

  async function load(append: boolean) {
    const mine = ++sequence;
    if (!append) offset = 0;
    loading = true;
    try {
      const found =
        (await searchSets({ query: text.trim(), offset, amount: PAGE_SIZE, mode, status })) ?? [];
      if (mine !== sequence) return;
      sets = append ? [...sets, ...found] : found;
      more = found.length === PAGE_SIZE;
      failed = false;
    } catch {
      if (mine !== sequence) return;
      failed = true;
      more = false;
    } finally {
      if (mine === sequence) loading = false;
    }
  }

  // Mode and status reload at once; typing waits for a pause.
  $effect(() => {
    void mode;
    void status;
    load(false);
  });

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => load(false), 300);
  }

  const sorted = (set: SearchedSet) =>
    [...set.ChildrenBeatmaps].sort((a, b) => a.DifficultyRating - b.DifficultyRating);
</script>

<svelte:head>
  <title>Beatmaps · RealistikOsu</title>
</svelte:head>

<Banner image="beatmaps.jpg">
  <div>
    <h1>Beatmaps</h1>
    <p class="sub">
      Find something to play, or a map to <a href="/rank-request">request for ranking</a>.
    </p>
  </div>
</Banner>

<main class="wrap listing" class:is-loading={loading}>
  <div class="listing-search">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input
      type="search"
      placeholder="Search by title, artist, mapper or tags"
      aria-label="Search beatmaps"
      bind:value={text}
      oninput={onInput}
    />
  </div>
  <div class="filters">
    <nav class="tabs" use:tabInk>
      {#each [['', 'Any'], ...modeNames.map((name, i) => [String(i), name])] as [code, name] (code)}
        <a
          class:active={mode === code}
          href="?mode={code}"
          onclick={(event) => {
            event.preventDefault();
            mode = code;
          }}
        >
          {#if code !== ''}<img src="/img/modes/mode-{code}.png" alt="" />{/if}{name}
        </a>
      {/each}
    </nav>
    <nav class="tabs status-tabs" use:tabInk>
      {#each statuses as option (option.name)}
        {@const look = mirrorStatusOf(Number(option.code))}
        <a
          class="{option.code === '' ? '' : look.colour} {status === option.code ? 'active' : ''}"
          href="?status={option.code}"
          onclick={(event) => {
            event.preventDefault();
            status = option.code;
          }}
        >
          {option.name}
        </a>
      {/each}
    </nav>
  </div>

  <div class="map-grid swap">
    {#each sets as set, i (set.SetID)}
      {@const diffs = sorted(set)}
      {@const look = mirrorStatusOf(set.RankedStatus)}
      {@const first = diffs[0]}
      <article class="map-card" style="--n: {Math.min(i % PAGE_SIZE, 11)}">
        <a
          class="map-cover"
          href="/beatmaps/{first?.BeatmapID}"
          style="background-image: url({coverUrl(set.SetID, 'card')})"
        >
          <span class="map-status {look.colour}"
            ><i class="fa-solid {look.icon}"></i>{look.name}</span
          >
          {#if set.HasVideo}<i class="fa-solid fa-film" title="Has video"></i>{/if}
        </a>
        <Preview setId={set.SetID} class="preview" />
        <div class="map-body">
          <a class="map-title" href="/beatmaps/{first?.BeatmapID}">{set.Title}</a>
          <div class="map-artist">{set.Artist}</div>
          <div class="map-meta">mapped by <b>{set.Creator}</b></div>
          <div class="map-diffs">
            <span class="dots">
              {#each diffs as d (d.BeatmapID)}
                <span
                  style="background: {starColour(d.DifficultyRating)}"
                  title="{d.DiffName} · {d.DifficultyRating.toFixed(2)}★"
                ></span>
              {/each}
            </span>
            <span class="faint">
              {#if diffs.length === 1}
                {diffs[0].DifficultyRating.toFixed(2)}★
              {:else}
                {diffs[0].DifficultyRating.toFixed(2)}–{diffs.at(-1)?.DifficultyRating.toFixed(2)}★
              {/if}
            </span>
          </div>
          <div class="map-foot">
            {#if first?.TotalLength}
              <span><i class="fa-solid fa-clock"></i>{length(first.TotalLength)}</span>
              <span><i class="fa-solid fa-drum"></i>{+first.BPM.toFixed(2)} BPM</span>
            {/if}
            {#if isServerOnlySet(set.SetID)}
              <a class="downloads" href={downloadUrl(set.SetID)} title="Download from RealistikOsu">
                <span class="summary"><i class="fa-solid fa-download"></i>Download</span>
              </a>
            {:else}
              <details class="downloads">
                <summary><i class="fa-solid fa-download"></i>Download</summary>
                <div>
                  <a href={downloadUrl(set.SetID)}>RealistikOsu</a>
                  {#each mirrors as mirror (mirror.name)}
                    <a href={mirror.url(set.SetID)}>{mirror.name}</a>
                  {/each}
                </div>
              </details>
            {/if}
          </div>
        </div>
      </article>
    {/each}
    {#if loading}
      {#each Array(sets.length ? 3 : 6).keys() as n (n)}
        <article class="map-card skel-card" aria-hidden="true">
          <div class="map-cover skel-block"></div>
          <div class="map-body">
            <span class="skel" style="width: 72%"></span>
            <span class="skel" style="width: 44%"></span>
            <span class="skel" style="width: 56%"></span>
            <span class="skel" style="width: 34%"></span>
          </div>
        </article>
      {/each}
    {/if}
  </div>
  {#if !loading && (failed || sets.length === 0)}
    <p class="listing-note">
      {failed ? "Couldn't load beatmaps. Try again in a bit." : 'No beatmaps match these filters.'}
    </p>
  {/if}
  {#if more && !loading}
    <button class="btn load-more" type="button" onclick={() => ((offset += PAGE_SIZE), load(true))}>
      Load more
    </button>
  {/if}
</main>
