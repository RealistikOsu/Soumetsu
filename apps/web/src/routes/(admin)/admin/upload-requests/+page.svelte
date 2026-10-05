<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { reviewUploadRequest, uploadRequests, type UploadStatus } from '$lib/api/uploads';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { flash } from '$lib/flash.svelte';
  import { timeAgo } from '$lib/format';

  const statuses: UploadStatus[] = ['pending', 'accepted', 'rejected'];

  const status = $derived(
    statuses.find((value) => value === page.url.searchParams.get('status')) ?? 'pending'
  );
  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const list = query((signal) => uploadRequests(status, current, signal));

  const go = (next: { status?: UploadStatus; p?: number }) =>
    goto(
      `/admin/upload-requests?status=${next.status ?? status}${next.p && next.p > 1 ? `&p=${next.p}` : ''}`
    );

  async function review(id: number, decision: UploadStatus) {
    try {
      await reviewUploadRequest(id, decision);
      flash.show('success', 'Request updated.');
      list.reload();
    } catch (error) {
      flash.show('error', describe(error));
    }
  }
</script>

<AdminHead
  heading="Upload requests"
  text="Plays players want on the YouTube channel. Votes show what the community thinks."
>
  {#snippet extra()}
    <nav class="tabs" use:tabInk>
      {#each statuses as value (value)}
        <a
          class:active={value === status}
          href="?status={value}"
          onclick={(event) => {
            event.preventDefault();
            go({ status: value });
          }}>{value[0].toUpperCase() + value.slice(1)}</a
        >
      {/each}
    </nav>
  {/snippet}
</AdminHead>

<div class="table-wrap">
  <table class="board admin-table c-red">
    <thead>
      <tr>
        <th class="player">Player</th>
        <th>Why</th>
        <th>Score</th>
        <th>Votes</th>
        <th>When</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if list.state.status === 'ready'}
        {#each list.state.data.requests as request (request.id)}
          <tr>
            <td class="player">
              <a class="who" href="/admin/users/{request.user.id}">
                <Flag country={request.user.country} /><Avatar id={request.user.id} /><b
                  >{request.user.username}</b
                >
              </a>
            </td>
            <td class="note">{request.reason}</td>
            <td>
              {#if request.score}
                <a href="/beatmaps/{request.score.beatmap.beatmap_id}">
                  {request.score.beatmap.song_name}
                </a>
                <small class="dim">
                  {Math.round(request.score.pp)}pp · {request.score.accuracy.toFixed(2)}%
                </small>
              {:else}
                <span class="dim">Score gone</span>
              {/if}
              <small class="dim">
                ID {request.score_id}{request.skin ? ` · ${request.skin}` : ''}
              </small>
            </td>
            <td>+{request.up} / -{request.down}</td>
            <td class="dim">{timeAgo(request.created_at)}</td>
            <td class="actions">
              {#if request.status !== 'accepted'}
                <button
                  class="btn btn-small"
                  type="button"
                  onclick={() => review(request.id, 'accepted')}
                >
                  <i class="fa-solid fa-check"></i>Accept
                </button>
              {/if}
              {#if request.status !== 'rejected'}
                <button
                  class="btn btn-small"
                  type="button"
                  onclick={() => review(request.id, 'rejected')}
                >
                  <i class="fa-solid fa-xmark"></i>Reject
                </button>
              {/if}
              {#if request.status !== 'pending'}
                <button
                  class="btn btn-small"
                  type="button"
                  onclick={() => review(request.id, 'pending')}
                >
                  <i class="fa-solid fa-rotate-left"></i>Reopen
                </button>
              {/if}
            </td>
          </tr>
        {:else}
          <tr><td colspan="6" class="empty-note">Nothing here.</td></tr>
        {/each}
      {:else if list.state.status === 'loading'}
        {#each [0, 1, 2, 3] as n (n)}
          <tr><td colspan="6"><span class="skel" style="width: 100%; height: 36px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="6" class="empty-note">{describe(list.state.error)}</td></tr>
      {/if}
    </tbody>
  </table>
</div>

{#if list.state.status === 'ready' && list.state.data.pages > 1}
  <Pager
    page={current}
    pages={list.state.data.pages}
    hasNext={current < list.state.data.pages}
    onpage={(p) => go({ p })}
  />
{/if}
