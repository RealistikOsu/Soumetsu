<script lang="ts">
  import type { BeatmapRef } from '$lib/api/rankedPlay';
  import { coverUrl } from '$lib/assets';
  import { statusOf } from '$lib/beatmaps';
  import Stars from '$lib/components/Stars.svelte';
  import { modeNames } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';

  let {
    beatmap,
    ruleset,
    round,
    class: className = ''
  }: { beatmap: BeatmapRef; ruleset: number; round: number; class?: string } = $props();

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
      {m.ranked_round({ number: round })} · {beatmap.version} · {m.beatmaps_mapped_by()}
      <b>{beatmap.creator}</b>
    </div>
    <div class="map-diffs">
      <span class="rp-ruleset"
        ><img src="/img/modes/mode-{ruleset}.png" alt="" />{modeNames[ruleset]}</span
      >
      {#if beatmap.star_rating}<Stars value={beatmap.star_rating} />{/if}
    </div>
  </div>
  <div class="map-when">
    <span class="map-status {status.colour}"
      ><i class="fa-solid {status.icon}"></i>{status.name}</span
    >
  </div>
</div>
