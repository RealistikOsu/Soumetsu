<script lang="ts">
  import type { ScoreWithBeatmap } from '$lib/api/scores';
  import { replayUrl, coverUrl } from '$lib/assets';
  import { number, songParts, timeAgo } from '$lib/format';
  import { gradeClass, gradeLabel, gradeOf } from '$lib/grades';
  import { isLazer } from '$lib/modes';
  import { modsText } from '$lib/mods';
  import { m } from '$lib/paraglide/messages';

  let {
    score,
    own = false,
    rx = 0,
    pinned = false,
    watched,
    ondetails,
    onpin
  }: {
    score: ScoreWithBeatmap;
    own?: boolean;
    rx?: number;
    pinned?: boolean;
    watched?: number;
    ondetails: () => void;
    onpin: () => void;
  } = $props();

  const grade = $derived(gradeOf(score));
  const parts = $derived(songParts(score.beatmap.song_name));
  const mods = $derived(modsText(score.mods));
  let menu = $state<HTMLDetailsElement>();

  function onWindowClick(event: MouseEvent) {
    if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
  }
</script>

<svelte:window onclick={onWindowClick} />

<div
  class="score-row"
  class:is-failed={score.completed < 1}
  style="--cover: url({coverUrl(score.beatmap.beatmapset_id, 'card')})"
>
  <div class="score-bg"></div>
  <span class="grade grade-{gradeClass[grade]}">{gradeLabel(grade)}</span>
  <div class="score-info">
    <a class="song" href="/beatmaps/{score.beatmap.beatmap_id}">
      {parts.song}
      {#if parts.diff}<span>[{parts.diff}]</span>{/if}
    </a>
    <div class="score-meta">
      {number(score.score)} · {number(score.max_combo)}x{score.count_misses
        ? ` · ${m.profile_score_misses({ count: score.count_misses })}`
        : ''}
      {#if mods}<span class="mods">{mods}</span>{/if}
    </div>
    <time>{timeAgo(score.submitted_at)}</time>
  </div>
  <div class="score-pp">
    <b>{number(Math.round(score.pp))}pp</b><span>{number(score.accuracy, 2)}%</span>
    {#if watched !== undefined}<span class="watched"
        >{m.profile_score_watched({ count: watched })}</span
      >{/if}
  </div>
  <details class="score-menu" bind:this={menu}>
    <summary aria-label={m.profile_score_options()}
      ><i class="fa-solid fa-ellipsis-vertical"></i></summary
    >
    <div>
      <button
        type="button"
        onclick={() => {
          menu!.open = false;
          ondetails();
        }}
      >
        <i class="fa-solid fa-circle-info"></i>{m.profile_score_view_details()}
      </button>
      {#if score.completed === 3 && !isLazer(rx)}
        <a href={replayUrl(score.id)}
          ><i class="fa-solid fa-download"></i>{m.profile_score_download_replay()}</a
        >
      {/if}
      {#if own && score.completed >= 2 && !isLazer(rx)}
        <button
          type="button"
          onclick={() => {
            menu!.open = false;
            onpin();
          }}
        >
          <i class="fa-solid fa-thumbtack"></i>{pinned
            ? m.profile_score_unpin()
            : m.profile_score_pin()}
        </button>
      {/if}
    </div>
  </details>
</div>
