<script lang="ts">
  import { mostPlayed, profileSets, type MostPlayed, type ProfileSet } from '$lib/api/users';
  import { coverUrl } from '$lib/assets';
  import { number, songParts } from '$lib/format';
  import { isLazer } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';
  import ListPicker from './ListPicker.svelte';
  import LoadMoreList from './LoadMoreList.svelte';
  import MapRow from './MapRow.svelte';

  let {
    id,
    mode,
    rx,
    rankedSets,
    mappedSets
  }: {
    id: number;
    mode: number;
    rx: number;
    rankedSets: number;
    mappedSets: number;
  } = $props();

  type List = 'played' | 'ranked' | 'mapped';

  // Most played is per mode and lazer has none; the sets a player ranked or uploaded are not.
  const lists = $derived(
    [
      {
        key: 'played',
        label: m.profile_section_most_played(),
        icon: 'fa-play',
        colour: 'c-green',
        shown: !isLazer(rx)
      },
      {
        key: 'ranked',
        label: m.profile_section_ranked_sets(),
        icon: 'fa-angles-up',
        colour: 's-ranked',
        shown: rankedSets > 0
      },
      {
        key: 'mapped',
        label: m.profile_section_mapped_sets(),
        icon: 'fa-cloud-arrow-up',
        colour: 'c-orange',
        shown: mappedSets > 0
      }
    ].filter((list) => list.shown) as { key: List; label: string; icon: string; colour: string }[]
  );

  let picked = $state<List | null>(null);
  const list = $derived(lists.find((l) => l.key === picked)?.key ?? lists[0]?.key);
  let opened = $state.raw<List[]>([]);
  $effect(() => {
    if (list && !opened.includes(list)) opened = [...opened, list];
  });

  // "Artist - Title" reads better as the title first, like the other map rows.
  function titleOf(song: string) {
    const [artist, ...rest] = song.split(' - ');
    return rest.length ? { title: rest.join(' - '), artist } : { title: song, artist: '' };
  }
</script>

{#if list}
  <ListPicker items={lists} value={list} onselect={(key) => (picked = key)} />

  {#each opened as shown (shown)}
    <div class="score-lists" data-pane="maps-{shown}" hidden={shown !== list}>
      {#if shown === 'played'}
        {#key `${mode}-${rx}`}
          <LoadMoreList
            colour="c-green"
            key={(item: MostPlayed) => item.beatmap.beatmap_id}
            load={(page, signal) => mostPlayed(id, mode, rx, page, 5, signal)}
          >
            {#snippet row(item: MostPlayed)}
              {@const parts = songParts(item.beatmap.song_name)}
              {@const song = titleOf(parts.song)}
              {@const href = `/beatmaps/${item.beatmap.beatmap_id}`}
              <div
                class="score-row map-row"
                style="--cover: url({coverUrl(item.beatmap.beatmapset_id, 'card')})"
              >
                <div class="score-bg"></div>
                <a
                  class="map-thumb"
                  {href}
                  style="background-image: url({coverUrl(item.beatmap.beatmapset_id, 'list')})"
                  aria-hidden="true"
                  tabindex="-1"
                ></a>
                <div class="score-info">
                  <a class="song" {href}
                    >{song.title}
                    {#if song.artist}<span>– {song.artist}</span>{/if}</a
                  >
                  <div class="score-meta">{parts.diff}</div>
                </div>
                <div class="map-when">
                  <span class="map-plays"
                    >{number(item.playcount)}
                    {m.profile_most_played_plays({ count: item.playcount })}</span
                  >
                </div>
              </div>
            {/snippet}
          </LoadMoreList>
        {/key}
      {:else}
        <LoadMoreList
          colour={shown === 'ranked' ? 's-ranked' : 'c-orange'}
          key={(set: ProfileSet) => set.beatmapset_id}
          load={(page, signal) => profileSets(shown, id, page, 5, signal)}
        >
          {#snippet row(set: ProfileSet)}<MapRow {set} mapper={shown === 'ranked'} />{/snippet}
        </LoadMoreList>
      {/if}
    </div>
  {/each}
{/if}
