<script lang="ts">
  import { messageReports } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { timeAgo } from '$lib/format';

  const reports = query((signal) => messageReports(signal));
</script>

<AdminHead
  heading="Message reports"
  text="Private messages players reported. Opening one shows the conversation around it, and is logged."
/>

<div class="table-wrap">
  <table class="board admin-table c-orange">
    <thead>
      <tr>
        <th class="player">Sent by</th>
        <th>Message</th>
        <th>Reason</th>
        <th class="player">Reported by</th>
        <th>When</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if reports.state.status === 'ready'}
        {#each reports.state.data as report (report.id)}
          <tr>
            <td class="player">
              <a class="who" href="/admin/users/{report.sender_id}">
                <Avatar id={report.sender_id} /><b>{report.sender_name}</b>
              </a>
            </td>
            <td class="note" title={report.content}>{report.content}</td>
            <td class="note" title={report.reason}>{report.reason}</td>
            <td class="player">
              <a class="who" href="/admin/users/{report.reporter_id}">
                <Avatar id={report.reporter_id} /><b>{report.reporter_name}</b>
              </a>
            </td>
            <td class="dim">{timeAgo(report.created_at)}</td>
            <td><a class="btn" href="/admin/message-reports/{report.id}">Review</a></td>
          </tr>
        {:else}
          <tr><td colspan="6" class="empty-note">No open reports.</td></tr>
        {/each}
      {:else if reports.state.status === 'loading'}
        {#each [0, 1, 2, 3] as n (n)}
          <tr><td colspan="6"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="6" class="empty-note">Couldn't load the reports.</td></tr>
      {/if}
    </tbody>
  </table>
</div>
