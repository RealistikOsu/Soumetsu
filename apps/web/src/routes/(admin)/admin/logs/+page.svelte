<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { actionLogs } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { logLook } from '$lib/components/admin/look';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { dayLabel, timeAgo } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const term = $derived(page.url.searchParams.get('q') ?? '');
  const logs = query((signal) => actionLogs(current, term, signal));

  let search = $derived(term);

  function go(p: number, q = term) {
    const params = [q && `q=${encodeURIComponent(q)}`, p > 1 && `p=${p}`].filter(Boolean);
    goto(`/admin/logs${params.length ? `?${params.join('&')}` : ''}`, { keepFocus: true });
  }

  const days = $derived.by(() => {
    if (logs.state.status !== 'ready') return [];
    const groups: { label: string; rows: typeof logs.state.data.rows }[] = [];
    for (const row of logs.state.data.rows) {
      const label = dayLabel(row.datetime);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.rows.push(row);
      else groups.push({ label, rows: [row] });
    }
    return groups;
  });
</script>

<AdminHead heading="Action logs" text="Everything staff have done through the panel, newest first.">
  {#snippet extra()}
    <form
      class="find-box"
      onsubmit={(event) => {
        event.preventDefault();
        go(1, search.trim());
      }}
    >
      <i class="fa-solid fa-magnifying-glass"></i>
      <input
        type="search"
        bind:value={search}
        placeholder="Staff member or action"
        aria-label="Filter logs"
      />
    </form>
  {/snippet}
</AdminHead>

{#if logs.state.status === 'ready'}
  {#each days as day (day.label)}
    <h2 class="day-label">{day.label}</h2>
    <ol class="log-feed">
      {#each day.rows as row (row.id)}
        {@const look = logLook(row.text)}
        <li class={look.colour}>
          <i class="fa-solid {look.icon}"></i>
          <Avatar id={row.userid} />
          <p>
            <a href="/admin/users/{row.userid}">{row.username ?? row.userid}</a>
            {row.text}
            {#if row.through}<small>{row.through}</small>{/if}
          </p>
          <time>{timeAgo(row.datetime)}</time>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="panel empty-note">Nothing matches.</p>
  {/each}
  {#if logs.state.data.pages > 1}
    <Pager
      page={current}
      pages={logs.state.data.pages}
      hasNext={current < logs.state.data.pages}
      onpage={(p) => go(p)}
    />
  {/if}
{:else if logs.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 300px"></span>
{:else}
  <p class="panel empty-note">Couldn't load the logs.</p>
{/if}
