<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { reviewUploadRequest, uploadRequests, type UploadStatus } from '$lib/api/uploads';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
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
    <nav class="seg">
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

{#if list.state.status === 'ready'}
  <div class="cases">
    {#each list.state.data.requests as request (request.id)}
      <article class="case">
        <Avatar id={request.user.id} />
        <div class="case-line">
          <a href="/admin/users/{request.user.id}">{request.user.username}</a>
          <span class="votes">
            <span class="up"><i class="fa-solid fa-thumbs-up"></i>{request.up}</span>
            <span class="down"><i class="fa-solid fa-thumbs-down"></i>{request.down}</span>
          </span>
        </div>
        <div class="case-side">
          {#if request.status !== 'pending'}
            <button class="act" type="button" onclick={() => review(request.id, 'pending')}>
              <i class="fa-solid fa-rotate-left"></i>Reopen
            </button>
          {/if}
          {#if request.status !== 'rejected'}
            <button class="act" type="button" onclick={() => review(request.id, 'rejected')}>
              Reject
            </button>
          {/if}
          {#if request.status !== 'accepted'}
            <button
              class="act go c-green"
              type="button"
              onclick={() => review(request.id, 'accepted')}
            >
              <i class="fa-solid fa-check"></i>Accept
            </button>
          {/if}
        </div>
        <p class="case-sub">
          {#if request.score}
            <a href="/beatmaps/{request.score.beatmap.beatmap_id}"
              >{request.score.beatmap.song_name}</a
            >
            · <b class="pp">{Math.round(request.score.pp)}pp</b> · {request.score.accuracy.toFixed(
              2
            )}%
          {:else}
            <span class="faint">Score {request.score_id} is gone</span>
          {/if}
          {#if request.skin_url}
            · <a href={request.skin_url} target="_blank" rel="noopener noreferrer">Skin</a>
          {/if}
          · <time>{timeAgo(request.created_at)}</time>
          {#if request.reason}<br /><q>{request.reason}</q>{/if}
        </p>
      </article>
    {:else}
      <div class="empty-state">
        <i class="fa-solid fa-circle-check"></i>
        <b>Nothing {status}</b>
      </div>
    {/each}
  </div>
  {#if list.state.data.pages > 1}
    <Pager
      page={current}
      pages={list.state.data.pages}
      hasNext={current < list.state.data.pages}
      onpage={(p) => go({ p })}
    />
  {/if}
{:else if list.state.status === 'loading'}
  <div class="cases">
    {#each [0, 1, 2] as n (n)}
      <span class="skel" style="width: 100%; height: 84px"></span>
    {/each}
  </div>
{:else}
  <p class="panel empty-note">{describe(list.state.error)}</p>
{/if}
