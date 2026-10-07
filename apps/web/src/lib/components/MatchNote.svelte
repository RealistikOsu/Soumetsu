<script lang="ts">
  import type { UserRef } from '$lib/api/rankedPlay';
  import Avatar from '$lib/components/Avatar.svelte';
  import { clock, fromIso } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let {
    event
  }: {
    event: {
      type: 'joined' | 'left' | 'disbanded' | 'round_ended' | 'game_ended';
      at: string;
      user: UserRef | null;
    };
  } = $props();

  const notes = {
    joined: { icon: 'fa-right-to-bracket', colour: 'c-green' },
    left: { icon: 'fa-right-from-bracket', colour: 'c-orange' },
    disbanded: { icon: 'fa-ban', colour: 'c-red' },
    round_ended: { icon: 'fa-flag-checkered', colour: 'c-blue' },
    game_ended: { icon: 'fa-flag-checkered', colour: 'c-blue' }
  };

  const note = $derived(notes[event.type]);
</script>

<li class="rp-event rp-note">
  <span class="rp-dot {note.colour}"><i class="fa-solid {note.icon}"></i></span>
  <p>
    {#if event.user}
      <a href="/users/{event.user.id}"><Avatar id={event.user.id} /></a>
      <a href="/users/{event.user.id}"><b>{event.user.username}</b></a>
    {/if}
    {#if event.type === 'joined'}
      {m.ranked_joined()}
    {:else if event.type === 'left'}
      {m.ranked_left()}
    {:else if event.type === 'disbanded'}
      {m.ranked_disbanded()}
    {:else}
      {m.ranked_game_ended()}
    {/if}
    <time>{clock(fromIso(event.at))}</time>
  </p>
</li>
