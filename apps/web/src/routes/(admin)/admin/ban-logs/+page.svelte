<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { banLogs } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import AdminTag from '$lib/components/admin/AdminTag.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { timeAgo } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const logs = query((signal) => banLogs(current, signal));

  const tags: Record<string, [string, string]> = {
    Restrict: ['Restricted', 'c-orange'],
    Unrestrict: ['Unrestricted', 'c-green'],
    Ban: ['Banned', 'c-red'],
    Unban: ['Unbanned', 'c-green'],
    Freeze: ['Frozen', 'c-lblue'],
    Silence: ['Silenced', 'c-purple']
  };
</script>

<AdminHead
  heading="Ban logs"
  text="Restrictions, bans, silences and freezes, with the reason given."
/>

<div class="table-wrap">
  <table class="board admin-table c-red">
    <thead>
      <tr>
        <th class="player">By</th>
        <th></th>
        <th class="player">User</th>
        <th>Action</th>
        <th>Reason</th>
        <th>When</th>
      </tr>
    </thead>
    <tbody>
      {#if logs.state.status === 'ready'}
        {#each logs.state.data.rows as row, i (i)}
          {@const known = tags[row.summary]}
          {@const tag = known ?? ['Flagged', 'c-grey']}
          <tr>
            <td class="player">
              <a class="who" href="/admin/users/{row.from_id}">
                <Avatar id={row.from_id} /><b>{row.from_name}</b>
              </a>
            </td>
            <td class="arrow"><i class="fa-solid fa-arrow-right"></i></td>
            <td class="player">
              <div class="who-row">
                <a class="who" href="/admin/users/{row.to_id}">
                  <Avatar id={row.to_id} /><b>{row.to_name}</b>
                </a>
              </div>
            </td>
            <td><AdminTag colour={tag[1]}>{tag[0]}</AdminTag></td>
            <td class="note" title={row.detail}>
              {#if known}
                {row.detail}
              {:else}
                <b>{row.summary}</b>{#if row.detail !== row.summary}
                  · {row.detail}{/if}
              {/if}
            </td>
            <td class="dim">{timeAgo(row.ts)}</td>
          </tr>
        {:else}
          <tr><td colspan="6" class="empty-note">Nothing logged yet.</td></tr>
        {/each}
      {:else if logs.state.status === 'loading'}
        {#each [0, 1, 2, 3, 4, 5, 6, 7] as n (n)}
          <tr><td colspan="6"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="6" class="empty-note">Couldn't load the ban logs.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

{#if logs.state.status === 'ready' && logs.state.data.pages > 1}
  <Pager
    page={current}
    pages={logs.state.data.pages}
    hasNext={current < logs.state.data.pages}
    onpage={(p) => goto(`/admin/ban-logs${p > 1 ? `?p=${p}` : ''}`)}
  />
{/if}
