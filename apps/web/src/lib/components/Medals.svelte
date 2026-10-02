<script lang="ts">
  import { achievements } from '$lib/api/users';
  import { query } from '$lib/api/query.svelte';
  import { m } from '$lib/paraglide/messages';
  import SectionTitle from './SectionTitle.svelte';

  let { id }: { id: number } = $props();

  const list = query((signal) => achievements(id, signal));
  const earned = $derived(
    list.state.status === 'ready' ? list.state.data.filter((a) => a.achieved) : []
  );
  const total = $derived(list.state.status === 'ready' ? list.state.data.length : 0);
</script>

<SectionTitle colour="c-purple" icon="fa-medal">
  {m.profile_achievements_title()}
  {#if list.state.status === 'ready'}<small
      >{m.profile_achievements_count({ earned: earned.length, total })}</small
    >{/if}
</SectionTitle>
<div class="panel medals c-purple">
  {#if list.state.status === 'error'}
    <p class="empty-note">{m.profile_achievements_error()}</p>
  {:else if list.state.status === 'ready' && earned.length === 0}
    <p class="empty-note">{m.profile_achievements_empty()}</p>
  {:else}
    {#each earned as medal (medal.id)}
      <img
        src="https://assets.ppy.sh/medals/web/{medal.file}.png"
        alt={medal.name}
        title={medal.name}
        loading="lazy"
      />
    {/each}
  {/if}
</div>
