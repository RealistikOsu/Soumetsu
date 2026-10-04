<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { messageReport, resolveMessageReport } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';
  import { dateTime } from '$lib/format';

  const id = $derived(Number(page.params.id));
  const detail = query((signal) => messageReport(id, signal));

  async function resolve() {
    try {
      await resolveMessageReport(id);
      flash.next('success', 'Report resolved.');
      await goto('/admin/message-reports');
    } catch (error) {
      flash.show('error', describe(error));
    }
  }
</script>

<AdminHead heading="Message report #{id}" text="The conversation around the reported message.">
  {#snippet extra()}
    {#if detail.state.status === 'ready' && !detail.state.data.report.resolved_at}
      <button class="btn btn-green" type="button" onclick={resolve}>
        <i class="fa-solid fa-check"></i>Resolve
      </button>
    {/if}
  {/snippet}
</AdminHead>

{#if detail.state.status === 'ready'}
  {@const { report, messages } = detail.state.data}
  <div class="panel c-orange report-summary">
    <p>
      <a href="/admin/users/{report.reporter_id}">{report.reporter}</a> reported a message from
      <a href="/admin/users/{report.sender_id}">{report.sender}</a>:
      <b>{report.reason}</b>
    </p>
  </div>
  <div class="panel reported-thread">
    {#each messages as message (message.id)}
      <div class="line" class:flagged={message.id === report.message_id}>
        <span class="dim">{dateTime(message.time)}</span>
        <b>{message.from === report.sender_id ? report.sender : report.reporter}</b>
        <span class="text">{message.content}</span>
      </div>
    {/each}
  </div>
{:else if detail.state.status === 'error'}
  <p class="empty-note">{describe(detail.state.error)}</p>
{:else}
  <span class="skel" style="width: 100%; height: 200px"></span>
{/if}
