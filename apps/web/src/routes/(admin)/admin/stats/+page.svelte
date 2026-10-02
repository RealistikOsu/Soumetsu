<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminStats } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import PlayTable from '$lib/components/admin/PlayTable.svelte';
  import { CountUp } from '@soumetsu/ui';

  const minPp = $derived(Math.max(0, Number(page.url.searchParams.get('minpp')) || 0));
  const stats = query((signal) => adminStats(minPp, signal));

  let field = $derived(String(minPp));

  const data = $derived(stats.state.status === 'ready' ? stats.state.data : null);
  const peak = $derived(
    stats.state.status === 'ready'
      ? Math.max(...stats.state.data.days.map((d) => d.registered), 1)
      : 1
  );
  const week = $derived(
    stats.state.status === 'ready'
      ? stats.state.data.days.reduce((sum, d) => sum + d.registered, 0)
      : 0
  );

  const cards = $derived([
    {
      colour: 'c-green',
      icon: 'fa-user-clock',
      text: 'Active today',
      value: data?.active ?? null
    },
    {
      colour: 'c-blue',
      icon: 'fa-user-plus',
      text: 'Registered this week',
      value: data ? week : null
    },
    {
      colour: 'c-red',
      icon: 'fa-user-lock',
      text: 'Restricted or banned',
      value: data?.restricted ?? null
    }
  ]);

  const label = (unix: number) =>
    new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
</script>

<AdminHead heading="Statistics" text="Activity across the server." />

<div class="counters admin-counters stats-counters">
  {#each cards as { colour, icon, text, value } (text)}
    <div class={colour}>
      <i class="fa-solid {icon}"></i>
      <b>
        {#if value === null}<span class="skel" style="width: 60px"></span>{:else}<CountUp
            {value}
          />{/if}
      </b>
      {text}
    </div>
  {/each}
</div>

<h2 class="section-title c-blue">
  <i class="fa-solid fa-chart-column"></i>Registrations <small>last 7 days</small>
</h2>
<div class="panel bars c-blue">
  {#if stats.state.status === 'ready'}
    {#each stats.state.data.days as day, i (day.end)}
      <div class="reg-bar" style="--h:{(day.registered / peak) * 100}%;--i:{i}">
        <b>{day.registered}</b><span>{label(day.end)}</span>
      </div>
    {/each}
  {/if}
</div>

<div class="section-title chart-head c-purple">
  <h2><i class="fa-solid fa-fire"></i>Big plays</h2>
  <form
    class="pp-filter"
    onsubmit={(event) => {
      event.preventDefault();
      goto(`/admin/stats?minpp=${Math.max(0, Number(field) || 0)}`, { keepFocus: true });
    }}
  >
    <label for="minpp">At least</label>
    <input id="minpp" type="number" min="0" step="50" bind:value={field} />
    <span>pp</span>
  </form>
</div>
<PlayTable
  plays={stats.state.status === 'ready' ? stats.state.data.plays : []}
  loading={stats.state.status === 'loading'}
  accuracy
/>
