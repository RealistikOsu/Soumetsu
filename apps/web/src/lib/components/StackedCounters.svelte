<script lang="ts">
  import { CountUp } from '@soumetsu/ui';
  import { query } from '$lib/api/query.svelte';
  import { stats } from '$lib/api/stats';
  import { m } from '$lib/paraglide/messages';
  import { site } from '$lib/site.svelte';
  import Username from './Username.svelte';

  const counts = query((signal) => stats(signal));
</script>

<div class="counters stacked">
  <div class="c-blue">
    <i class="fa-solid fa-user"></i>
    <b>
      {#if counts.state.status === 'ready'}
        <CountUp value={counts.state.data.online_users} /> /
        <CountUp value={counts.state.data.registered_users} />
      {:else}
        <span class="skel" style="width: 90px"></span>
      {/if}
    </b>
    {m.home_counter_online_registered()}
  </div>
  <div class="c-orange">
    <i class="fa-solid fa-user-plus"></i>
    <b>
      {#if site.info?.latestPlayer}
        <Username id={site.info.latestPlayer.id} name={site.info.latestPlayer.username} />
      {:else}
        <span class="skel" style="width: 70px"></span>
      {/if}
    </b>
    {m.home_counter_latest_player()}
  </div>
</div>
