<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { banLogs } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { timeAgo } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const logs = query((signal) => banLogs(current, signal));

  const looks: Record<string, [string, string, string]> = {
    Restrict: ['restricted', 'c-orange', 'fa-circle-exclamation'],
    Unrestrict: ['unrestricted', 'c-green', 'fa-rotate-left'],
    Ban: ['banned', 'c-red', 'fa-ban'],
    Unban: ['unbanned', 'c-green', 'fa-rotate-left'],
    Freeze: ['froze', 'c-lblue', 'fa-snowflake'],
    Silence: ['silenced', 'c-purple', 'fa-comment-slash']
  };
</script>

<AdminHead
  heading="Ban logs"
  text="Restrictions, bans, silences and freezes, with the reason given."
/>

{#if logs.state.status === 'ready'}
  <ol class="log-feed">
    {#each logs.state.data.rows as row, i (i)}
      {@const known = looks[row.summary]}
      {@const [verb, colour, icon] = known ?? [row.summary.toLowerCase(), 'c-grey', 'fa-flag']}
      <li class={colour}>
        <i class="fa-solid {icon}"></i>
        <Avatar id={row.to_id} />
        <p>
          <a href="/admin/users/{row.from_id}">{row.from_name}</a>
          {verb}
          <a href="/admin/users/{row.to_id}">{row.to_name}</a>
          {#if row.detail && row.detail !== row.summary}<small>{row.detail}</small>{/if}
        </p>
        <time>{timeAgo(row.ts)}</time>
      </li>
    {:else}
      <li class="faint">Nothing logged yet.</li>
    {/each}
  </ol>
  {#if logs.state.data.pages > 1}
    <Pager
      page={current}
      pages={logs.state.data.pages}
      hasNext={current < logs.state.data.pages}
      onpage={(p) => goto(`/admin/ban-logs${p > 1 ? `?p=${p}` : ''}`)}
    />
  {/if}
{:else if logs.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 300px"></span>
{:else}
  <p class="panel empty-note">Couldn't load the ban logs.</p>
{/if}
