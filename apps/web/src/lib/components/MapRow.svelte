<script lang="ts">
  import { mirrorSet } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';
  import type { ProfileSet } from '$lib/api/users';
  import { coverUrl } from '$lib/assets';
  import { starColour, statusOf } from '$lib/beatmaps';
  import { timeAgo } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let { set, mapper = true }: { set: ProfileSet; mapper?: boolean } = $props();

  const status = $derived(statusOf(set.status));
  const diffs = $derived(set.difficulties);
  const href = $derived(`/beatmaps/${diffs[0].beatmap_id}`);
  const stars = (value: number) => value.toFixed(2);

  // Maps uploaded here come with their mapper; for osu!'s own maps the name is on the mirror.
  const fromMirror = query((signal) =>
    mapper && !set.creator
      ? mirrorSet(set.beatmapset_id, signal).then((found) => found.creator)
      : Promise.resolve(null)
  );
  const creator = $derived(
    set.creator ?? (fromMirror.state.status === 'ready' ? fromMirror.state.data : null)
  );
</script>

<div class="score-row map-row" style="--cover: url({coverUrl(set.beatmapset_id, 'card')})">
  <div class="score-bg"></div>
  <a
    class="map-thumb"
    {href}
    style="background-image: url({coverUrl(set.beatmapset_id, 'list')})"
    aria-hidden="true"
    tabindex="-1"
  ></a>
  <div class="score-info">
    <a class="song" {href}
      >{set.title}
      {#if set.artist}<span>– {set.artist}</span>{/if}</a
    >
    <div class="score-meta">
      {#if mapper && creator}{m.beatmaps_mapped_by()} <b>{creator}</b> ·{/if}
      {m.profile_sets_difficulties({ count: diffs.length })}
    </div>
    <div class="map-diffs">
      <span class="dots">
        {#each diffs as diff (diff.beatmap_id)}
          <span
            style="background: {starColour(diff.stars)}"
            title="{diff.version} · {stars(diff.stars)}★"
          ></span>
        {/each}
      </span>
      <!-- Maps uploaded here have no star rating until one is calculated. -->
      {#if diffs[diffs.length - 1].stars > 0}
        <span class="faint">
          {stars(diffs[0].stars)}{#if diffs.length > 1}–{stars(diffs[diffs.length - 1].stars)}{/if}★
        </span>
      {/if}
    </div>
  </div>
  <div class="map-when">
    <span class="map-status {status.colour}"
      ><i class="fa-solid {status.icon}"></i>{status.name}</span
    >
    {#if set.time}<time>{timeAgo(set.time)}</time>{/if}
  </div>
</div>
