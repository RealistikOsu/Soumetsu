<script lang="ts">
  import { inView, tabInk } from '@soumetsu/ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    beatmap as ourBeatmap,
    beatmapScores,
    beatmapSet as ourSet,
    type Beatmap,
    type BeatmapScore
  } from '$lib/api/beatmaps';
  import { mirrorBeatmap, mirrorSet, type MirrorBeatmap, type MirrorSet } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';
  import { coverUrl, downloadUrl, isServerOnlySet, mirrors, replayUrl } from '$lib/assets';
  import { mirrorStatusKey, statusOf, type Status } from '$lib/beatmaps';
  import Avatar from '$lib/components/Avatar.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import ModeTabs from '$lib/components/ModeTabs.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import Preview from '$lib/components/Preview.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Stars from '$lib/components/Stars.svelte';
  import Username from '$lib/components/Username.svelte';
  import { length, number, timeAgo } from '$lib/format';
  import { gradeClass, gradeLabel, gradeOf } from '$lib/grades';
  import { modeNames, allowed, relaxColours, relaxNames, slideTowards } from '$lib/modes';
  import { modsText } from '$lib/mods';
  import { m } from '$lib/paraglide/messages';
  import { canRankBeatmaps } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';

  const id = $derived(Number(page.params.id));

  interface Diff {
    id: number;
    name: string;
    stars: number;
    mode: number;
    status: Status;
    cs: number | null;
    hp: number | null;
    od: number;
    ar: number;
    bpm: number;
    length: number | null;
    drain: number;
    maxCombo: number;
    passes: number | null;
    plays: number | null;
  }

  interface Loaded {
    setId: number;
    title: string;
    artist: string;
    creator: string;
    source: string;
    diffs: Diff[];
  }

  // The mirror describes the maps; the game server knows how each one is ranked here and its plays.
  const info = query<Loaded | null>(async (signal) => {
    const [mine, theirs] = await Promise.allSettled([
      ourBeatmap(id, signal),
      mirrorBeatmap(id, signal)
    ]);
    const setId =
      mine.status === 'fulfilled'
        ? mine.value.beatmapset_id
        : theirs.status === 'fulfilled'
          ? theirs.value.set_id
          : null;
    if (setId === null) return null;

    const [ours, mirrorSetResult] = await Promise.allSettled([
      ourSet(setId, signal),
      mirrorSet(setId, signal)
    ]);
    const ourMaps: Beatmap[] = ours.status === 'fulfilled' ? ours.value : [];
    const set: MirrorSet | null =
      mirrorSetResult.status === 'fulfilled' ? mirrorSetResult.value : null;

    const fromMirror = (b: MirrorBeatmap): Diff => {
      const mine = ourMaps.find((m) => m.beatmap_id === b.id);
      return {
        id: b.id,
        name: b.version,
        stars: b.difficulty_rating,
        mode: b.mode_int,
        status: mine ? statusOf(mine.ranked) : mirrorStatusKey(b.status),
        cs: b.cs,
        hp: b.hp,
        od: b.od,
        ar: b.ar,
        bpm: b.bpm,
        length: b.total_length,
        drain: b.hit_length,
        maxCombo: b.max_combo,
        passes: mine?.passcount ?? null,
        plays: mine?.playcount ?? null
      };
    };
    const fromOurs = (m: Beatmap): Diff => {
      const name = m.song_name.match(/\[(.*)\]$/)?.[1] ?? m.song_name;
      return {
        id: m.beatmap_id,
        name,
        stars: [m.difficulty_std, m.difficulty_taiko, m.difficulty_ctb, m.difficulty_mania][m.mode],
        mode: m.mode,
        status: statusOf(m.ranked),
        cs: null,
        hp: null,
        od: m.od,
        ar: m.ar,
        bpm: m.bpm,
        length: null,
        drain: m.hit_length,
        maxCombo: m.max_combo,
        passes: m.passcount,
        plays: m.playcount
      };
    };

    const diffs = (set ? set.beatmaps.map(fromMirror) : ourMaps.map(fromOurs)).sort(
      (a, b) => a.stars - b.stars
    );
    if (diffs.length === 0) return null;

    const first = ourMaps[0]?.song_name.match(/^(.*) - (.*) \[.*\]$/);
    return {
      setId,
      title: set?.title ?? first?.[2] ?? '',
      artist: set?.artist ?? first?.[1] ?? '',
      creator: set?.creator ?? '',
      source: set?.source ?? '',
      diffs
    };
  });

  const loaded = $derived(info.state.status === 'ready' ? info.state.data : null);
  const canRank = $derived(!!session.user && canRankBeatmaps(session.user.privileges));
  const diff = $derived(loaded?.diffs.find((d) => d.id === id) ?? null);

  const view = $derived.by(() => {
    const q = page.url.searchParams;
    const rx = [0, 1, 2].includes(Number(q.get('rx'))) && q.has('rx') ? Number(q.get('rx')) : 0;
    const asked = q.has('mode') ? Number(q.get('mode')) : (diff?.mode ?? 0);
    return { rx, mode: allowed(asked, rx) ? asked : 0 };
  });

  function go(next: Partial<typeof view>) {
    const merged = { ...view, ...next };
    if (!allowed(merged.mode, merged.rx)) merged.mode = 0;
    slideTowards(view, merged);
    goto(`?mode=${merged.mode}&rx=${merged.rx}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }

  let boards = $state.raw<Record<string, BeatmapScore[] | 'error'>>({});

  $effect(() => {
    const { mode } = view;
    const beatmapId = id;
    for (const rx of [0, 1, 2]) {
      const key = `${beatmapId}-${mode}-${rx}`;
      if (!allowed(mode, rx) || key in boards) continue;
      beatmapScores(beatmapId, mode, rx).then(
        (rows) => (boards = { ...boards, [key]: rows }),
        () => (boards = { ...boards, [key]: 'error' })
      );
    }
  });

  const board = $derived(boards[`${id}-${view.mode}-${view.rx}`]);
  const count = (rx: number) => {
    const rows = boards[`${id}-${view.mode}-${rx}`];
    return Array.isArray(rows) ? rows.length : null;
  };
  const byPp = $derived(view.rx > 0);
  const top = $derived(Array.isArray(board) ? board[0] : undefined);
  const rest = $derived(Array.isArray(board) ? board.slice(1) : []);

  const bars = $derived(
    diff
      ? (
          [
            [m.beatmaps_map_circle_size(), diff.cs],
            [m.beatmaps_map_hp_drain(), diff.hp],
            [m.beatmaps_map_overall_difficulty(), diff.od],
            [m.beatmaps_map_approach_rate(), diff.ar]
          ] as [string, number | null][]
        ).filter((bar): bar is [string, number] => bar[1] !== null)
      : []
  );
</script>

<svelte:head>
  <title
    >{loaded ? `${loaded.artist} - ${loaded.title}` : m.beatmaps_map_title_fallback()} · RealistikOsu</title
  >
</svelte:head>

{#if info.state.status === 'ready' && (!loaded || !diff)}
  <NotFound />
{:else if info.state.status === 'error'}
  <NotFound />
{:else}
  <Banner
    class="map-banner"
    url={loaded ? coverUrl(loaded.setId, 'cover') : '/img/headers/beatmaps.jpg'}
  >
    <div>
      <h1>{loaded?.title ?? ''}&nbsp;</h1>
      <p class="sub">
        {#if loaded}{loaded.artist}{loaded.creator
            ? ` · ${m.beatmaps_mapped_by()} ${loaded.creator}`
            : ''}{/if}
      </p>
    </div>
  </Banner>

  <main class="wrap map-page">
    <SectionTitle colour="c-purple" icon="fa-layer-group">
      {m.beatmaps_map_difficulties()}
      {#if loaded}<small>{loaded.diffs.length}</small>{/if}
    </SectionTitle>
    <nav class="panel diffs c-purple">
      {#each loaded?.diffs ?? [] as d (d.id)}
        <a class="diff" class:active={d.id === id} href="/beatmaps/{d.id}">
          <Stars value={d.stars} /><span>{d.name}</span>
          <i class="fa-solid {d.status.icon} status-icon {d.status.colour}" title={d.status.name}
          ></i>
        </a>
      {/each}
    </nav>

    {#if diff && loaded}
      <div class="map-info">
        <div class="panel map-stats c-blue">
          <h2>
            {diff.name}
            <Stars value={diff.stars} />
            <span class="map-status {diff.status.colour}">
              <i class="fa-solid {diff.status.icon}"></i>{diff.status.name}
            </span>
          </h2>
          <dl class="bars">
            {#each bars as [label, value] (label)}
              <div>
                <dt>{label}</dt>
                <dd>
                  <span class="bar" use:inView
                    ><span style="width: {Math.min(value, 10) * 10}%"></span></span
                  >
                  <span class="value">{Math.round(value * 10) / 10}</span>
                </dd>
              </div>
            {/each}
          </dl>
          <dl class="facts">
            <div>
              <dt>{m.beatmaps_map_length()}</dt>
              <dd>
                {length(diff.length ?? diff.drain)}
                {#if diff.length}<span class="faint"
                    >({m.beatmaps_map_drain({ time: length(diff.drain) })})</span
                  >{/if}
              </dd>
            </div>
            <div>
              <dt>BPM</dt>
              <dd>{Math.round(diff.bpm * 100) / 100}</dd>
            </div>
            <div>
              <dt>{m.beatmaps_map_max_combo()}</dt>
              <dd>{number(diff.maxCombo)}x</dd>
            </div>
            {#if diff.passes !== null}
              <div>
                <dt>{m.beatmaps_map_passes_plays()}</dt>
                <dd>{number(diff.passes)} / {number(diff.plays ?? 0)}</dd>
              </div>
            {/if}
            <div>
              <dt>{m.beatmaps_map_source()}</dt>
              <dd>
                {#if loaded.source}{loaded.source}{:else}<span class="faint">-</span>{/if}
              </dd>
            </div>
          </dl>
        </div>
        <div class="map-actions">
          {#if isServerOnlySet(loaded.setId)}
            <a class="action download" href={downloadUrl(loaded.setId)}>
              <i class="fa-solid fa-download"></i>{m.beatmaps_download()}
            </a>
          {:else}
            <a class="action osu-direct" href="osu://s/{loaded.setId}">
              <i class="fa-solid fa-download"></i>osu!direct
            </a>
            <a class="action download" href={downloadUrl(loaded.setId)}>
              <i class="fa-solid fa-download"></i>{m.beatmaps_download()}
            </a>
            {#each mirrors as mirror (mirror.name)}
              <a class="action mirror" href={mirror.url(loaded.setId)}>
                <i class="fa-solid fa-download"></i>{mirror.name}
              </a>
            {/each}
          {/if}
          <Preview setId={loaded.setId} class="action play">
            {#snippet children(playing)}
              <i class="fa-solid {playing ? 'fa-pause' : 'fa-play'}"></i>{playing
                ? m.beatmaps_preview_pause()
                : m.beatmaps_preview_play()}
            {/snippet}
          </Preview>
          {#if canRank}
            <a class="action staff-rank" href="/admin/ranking/{loaded.setId}">
              <i class="fa-solid fa-angles-up"></i>{m.beatmaps_staff_rank()}
            </a>
          {/if}
        </div>
      </div>
    {/if}

    <div class="filters mode-switch">
      <nav class="tabs tinted" use:tabInk>
        {#each relaxNames as name, i (name)}
          <a
            class="{relaxColours[i]} {i === view.rx ? 'active' : ''}"
            class:disabled={!allowed(view.mode, i)}
            href="?rx={i}"
            onclick={(event) => {
              event.preventDefault();
              if (allowed(view.mode, i)) go({ rx: i });
            }}
          >
            {name}
            {#if count(i) !== null}<span class="count">{count(i)}</span>{/if}
          </a>
        {/each}
      </nav>
      <div class="modes">
        <ModeTabs mode={view.mode} rx={view.rx} onselect={(mode) => go({ mode })} />
      </div>
    </div>

    <div class="score-pane {relaxColours[view.rx]}" data-pane="{view.mode}-{view.rx}">
      {#if board === undefined}
        <div class="panel top-play">
          <span class="skel" style="width: 100%; height: 70px"></span>
        </div>
      {:else if board === 'error'}
        <p class="panel empty">{m.beatmaps_scores_error()}</p>
      {:else if !top}
        <p class="panel empty">
          {m.beatmaps_scores_empty({
            relax: relaxNames[view.rx].toLowerCase(),
            mode: modeNames[view.mode]
          })}
        </p>
      {:else}
        {@const grade = gradeOf(top)}
        <div class="panel top-play">
          <span class="grade grade-{gradeClass[grade]}" title={grade}>{gradeLabel(grade)}</span>
          <Avatar id={top.player_id} />
          <div class="top-play-who">
            <span class="faint">#1</span>
            <a href="/users/{top.player_id}">
              <Username id={top.player_id} name={top.player.username} />
            </a>
            <Flag country={top.player.country} />
            <div class="faint">{timeAgo(top.submitted_at)}</div>
          </div>
          <dl class="top-play-stats">
            <div>
              <dt>{byPp ? 'PP' : m.beatmaps_scores_score()}</dt>
              <dd class="lead">{byPp ? `${number(Math.round(top.pp))}pp` : number(top.score)}</dd>
            </div>
            <div>
              <dt>{byPp ? m.beatmaps_scores_score() : 'PP'}</dt>
              <dd>{byPp ? number(top.score) : `${number(Math.round(top.pp))}pp`}</dd>
            </div>
            <div>
              <dt>{m.beatmaps_scores_accuracy()}</dt>
              <dd>{number(top.accuracy, 2)}%</dd>
            </div>
            <div>
              <dt>{m.beatmaps_scores_combo()}</dt>
              <dd>{top.max_combo}x</dd>
            </div>
            <div>
              <dt>{m.beatmaps_scores_mods()}</dt>
              <dd>
                {#if modsText(top.mods)}<span class="mods">{modsText(top.mods)}</span>{:else}<span
                    class="faint">{m.beatmaps_scores_none()}</span
                  >{/if}
              </dd>
            </div>
          </dl>
          <a class="btn" href={replayUrl(top.id)}
            ><i class="fa-solid fa-download"></i>{m.beatmaps_scores_replay()}</a
          >
        </div>
        {#if rest.length}
          <table class="panel scoreboard">
            <thead>
              <tr>
                <th class="place"></th>
                <th></th>
                <th class="player">{m.beatmaps_scores_player()}</th>
                <th>{m.beatmaps_scores_score()}</th>
                <th>{m.beatmaps_scores_accuracy()}</th>
                <th class="hide-sm">{m.beatmaps_scores_combo()}</th>
                <th>PP</th>
                <th class="hide-md">{m.beatmaps_scores_mods()}</th>
                <th class="hide-md">{m.beatmaps_scores_time()}</th>
                <th class="hide-sm"></th>
              </tr>
            </thead>
            <tbody>
              {#each rest as score, i (score.id)}
                {@const g = gradeOf(score)}
                <tr>
                  <td class="place">#{i + 2}</td>
                  <td><span class="grade grade-{gradeClass[g]}" title={g}>{gradeLabel(g)}</span></td
                  >
                  <td class="player">
                    <a href="/users/{score.player_id}">
                      <Flag country={score.player.country} /><Avatar
                        id={score.player_id}
                      /><Username id={score.player_id} name={score.player.username} />
                    </a>
                  </td>
                  <td class={byPp ? 'dim' : 'lead'}>{number(score.score)}</td>
                  <td class="dim">{number(score.accuracy, 2)}%</td>
                  <td class="dim hide-sm">{score.max_combo}x</td>
                  <td class={byPp ? 'lead' : 'dim'}>{number(Math.round(score.pp))}pp</td>
                  <td class="hide-md"><span class="mods">{modsText(score.mods)}</span></td>
                  <td class="dim hide-md">{timeAgo(score.submitted_at)}</td>
                  <td class="hide-sm">
                    <a
                      class="replay"
                      href={replayUrl(score.id)}
                      title={m.beatmaps_scores_download_replay()}
                    >
                      <i class="fa-solid fa-download"></i>
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}
    </div>
  </main>
{/if}
