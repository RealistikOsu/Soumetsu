<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { playerReports, resolvePlayerReport } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { flash } from '$lib/flash.svelte';
  import { dateTime, timeAgo } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const all = $derived(page.url.searchParams.get('all') === '1');
  let version = $state(0);
  const reports = query((signal) => {
    void version;
    return playerReports(all, current, signal);
  });

  async function resolve(id: number) {
    try {
      await resolvePlayerReport(id);
      flash.show('success', 'Report resolved.');
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
  }
</script>

<AdminHead
  heading="Player reports"
  text="Reports from profiles and from !report in game, which also saves the player's recent chat."
>
  {#snippet extra()}
    <a class="btn" href={all ? '/admin/reports' : '/admin/reports?all=1'}>
      {all ? 'Only open ones' : 'Show resolved too'}
    </a>
  {/snippet}
</AdminHead>

<div class="table-wrap">
  <table class="board admin-table c-red">
    <thead>
      <tr>
        <th class="player">Reported</th>
        <th>Reason</th>
        <th class="player">By</th>
        <th>When</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if reports.state.status === 'ready'}
        {#each reports.state.data.rows as report (report.id)}
          <tr>
            <td class="player">
              <a class="who" href="/admin/users/{report.to_uid}">
                <Avatar id={report.to_uid} /><b>{report.to_name ?? report.to_uid}</b>
              </a>
            </td>
            <td class="note report-reason">
              {report.reason}
              {#if report.chatlog}
                <details>
                  <summary>Their recent chat</summary>
                  <pre>{report.chatlog}</pre>
                </details>
              {/if}
            </td>
            <td class="player">
              <a class="who" href="/admin/users/{report.from_uid}">
                <Avatar id={report.from_uid} /><b>{report.from_name ?? report.from_uid}</b>
              </a>
            </td>
            <td class="dim" title={dateTime(report.time)}>{timeAgo(report.time)}</td>
            <td>
              {#if report.resolved_at}
                <span class="dim">Resolved by {report.resolved_name ?? 'someone'}</span>
              {:else}
                <button class="btn" type="button" onclick={() => resolve(report.id)}>Resolve</button
                >
              {/if}
            </td>
          </tr>
        {:else}
          <tr><td colspan="5" class="empty-note">No reports.</td></tr>
        {/each}
      {:else if reports.state.status === 'loading'}
        {#each [0, 1, 2, 3] as n (n)}
          <tr><td colspan="5"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="5" class="empty-note">Couldn't load the reports.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

{#if reports.state.status === 'ready' && reports.state.data.pages > 1}
  <Pager
    page={current}
    pages={reports.state.data.pages}
    hasNext={current < reports.state.data.pages}
    onpage={(p) => goto(`/admin/reports?${all ? 'all=1&' : ''}p=${p}`)}
  />
{/if}
