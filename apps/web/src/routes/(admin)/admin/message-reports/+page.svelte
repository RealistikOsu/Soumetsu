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

{#if reports.state.status === 'ready'}
  <div class="cases">
    {#each reports.state.data as report (report.id)}
      <article class="case">
        <Avatar id={report.sender_id} />
        <div class="case-line">
          <a href="/admin/users/{report.sender_id}">{report.sender_name}</a>
          <span class="muted">to</span>
          <a href="/admin/users/{report.reporter_id}">{report.reporter_name}</a>
          <span class="admin-tag c-orange reason-tag" title={report.reason}>{report.reason}</span>
        </div>
        <div class="case-side">
          <a class="act go c-orange" href="/admin/message-reports/{report.id}">Read conversation</a>
        </div>
        <p class="case-sub">
          <q>{report.content}</q> · <time>{timeAgo(report.created_at)}</time>
        </p>
      </article>
    {:else}
      <div class="empty-state">
        <i class="fa-solid fa-circle-check"></i>
        <b>Nothing to look at</b>
        <span>Every reported message has been handled.</span>
      </div>
    {/each}
  </div>
{:else if reports.state.status === 'loading'}
  <div class="cases">
    {#each [0, 1, 2] as n (n)}
      <span class="skel" style="width: 100%; height: 76px"></span>
    {/each}
  </div>
{:else}
  <p class="panel empty-note">Couldn't load the reports.</p>
{/if}
