<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { messageReport, resolveMessageReport } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
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

<a class="back" href="/admin/message-reports"
  ><i class="fa-solid fa-arrow-left"></i>Message reports</a
>

<AdminHead
  heading="Message report #{id}"
  text="The conversation around the reported message. Opening this was logged."
>
  {#snippet extra()}
    {#if detail.state.status === 'ready' && !detail.state.data.report.resolved_at}
      <button class="act go c-green" type="button" onclick={resolve}>
        <i class="fa-solid fa-check"></i>Resolve
      </button>
    {/if}
  {/snippet}
</AdminHead>

{#if detail.state.status === 'ready'}
  {@const { report, messages } = detail.state.data}
  <article class="case">
    <Avatar id={report.reporter_id} />
    <div class="case-line">
      <a href="/admin/users/{report.reporter_id}">{report.reporter}</a>
      <span class="muted">reported a message from</span>
      <a class="by" href="/admin/users/{report.sender_id}"
        ><Avatar id={report.sender_id} />{report.sender}</a
      >
      <span class="admin-tag c-orange">{report.reason}</span>
    </div>
    <p class="case-sub"><time>{dateTime(report.created_at)}</time></p>
  </article>
  <ol class="convo">
    {#each messages as message (message.id)}
      {@const theirs = message.from === report.sender_id}
      {@const flagged = message.id === report.message_id}
      <li class:me={!theirs} class:flagged>
        <Avatar id={message.from} />
        <div>
          <b>{theirs ? report.sender : report.reporter}</b>
          <time>{dateTime(message.time)}</time>
          <p>{message.content}</p>
          {#if flagged}
            <span class="admin-tag c-orange"><i class="fa-solid fa-flag"></i>Reported</span>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{:else if detail.state.status === 'error'}
  <p class="panel empty-note">{describe(detail.state.error)}</p>
{:else}
  <span class="skel" style="width: 100%; height: 200px"></span>
{/if}
