<script lang="ts">
  import type { Snippet } from 'svelte';
  import { mirrorSet } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';
  import type { BeatmapRef } from '$lib/api/rankedPlay';
  import { coverUrl } from '$lib/assets';
  import { statusOf } from '$lib/beatmaps';
  import Stars from '$lib/components/Stars.svelte';
  import { modeNames } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';

  let {
    beatmap,
    ruleset,
    label,
    class: className = '',
    children
  }: {
    beatmap: BeatmapRef;
    ruleset: number;
    label?: string;
    class?: string;
    children?: Snippet;
  } = $props();

  // Only maps uploaded here have a mapper in the database; everything else asks the mirror.
  const fromMirror = query(async (signal) =>
    beatmap.creator
      ? null
      : mirrorSet(beatmap.set_id, signal).then(
          (set) => set.creator,
          () => null
        )
  );
  const creator = $derived(
    beatmap.creator || (fromMirror.state.status === 'ready' ? fromMirror.state.data : null)
  );
  const status = $derived(statusOf(beatmap.ranked_status));
  const href = $derived(`/beatmaps/${beatmap.id}`);
</script>

<div
  class="score-row map-row rp-map {className}"
  style="--cover: url({coverUrl(beatmap.set_id, 'card')})"
>
  <div class="score-bg"></div>
  <a
    class="map-thumb"
    {href}
    style="background-image: url({coverUrl(beatmap.set_id, 'list')})"
    aria-hidden="true"
    tabindex="-1"
  ></a>
  <div class="score-info">
    <a class="song" {href}>{beatmap.title} <span>– {beatmap.artist}</span></a>
    <div class="score-meta">
      {#if label}{`${label} · `}{/if}{beatmap.version}{#if creator}{` · ${m.beatmaps_mapped_by()}`}
        <b>{creator}</b>{/if}
    </div>
    <div class="map-diffs">
      <span class="rp-ruleset"
        ><img src="/img/modes/mode-{ruleset}.png" alt="" />{modeNames[ruleset]}</span
      >
      {#if beatmap.star_rating}<Stars value={beatmap.star_rating} />{/if}
      {@render children?.()}
    </div>
  </div>
  <div class="map-when">
    <span class="map-status {status.colour}"
      ><i class="fa-solid {status.icon}"></i>{status.name}</span
    >
  </div>
</div>
