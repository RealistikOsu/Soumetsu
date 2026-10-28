<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { dismissRequest, rankRequests } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminDialog from '$lib/components/admin/AdminDialog.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import SetCreator from '$lib/components/admin/SetCreator.svelte';
  import { flash } from '$lib/flash.svelte';
  import { timeAgo } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  let version = $state(0);
  const list = query((signal) => {
    void version;
    return rankRequests(current, signal);
  });

  let dismissing = $state<number | null>(null);

  async function dismiss() {
    if (dismissing === null) return;
    try {
      await dismissRequest(dismissing);
      flash.show('success', 'Request dismissed.');
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
    dismissing = null;
  }
</script>

<AdminHead
  heading="Rank requests"
  text={list.state.status === 'ready' && list.state.data.requests.length
    ? 'Maps players want ranked. Reviewing opens the whole set.'
    : 'Maps players want ranked.'}
/>

{#if list.state.status === 'ready'}
  <div class="cases">
    {#each list.state.data.requests as request (request.id)}
      {@const target = request.setId ?? 0}
      <article
        class="case flat on-cover"
        style={request.cover ? `--cover: url(${request.cover})` : undefined}
      >
        <div class="case-line">
          <a href="/admin/ranking/{target}?set">{request.song}</a>
          {#if !request.stored}
            <span
              class="admin-tag c-grey"
              title="Nobody has played it here, so it's read from the mirror"
              >Not played here yet</span
            >
          {/if}
          <span class="mode-icons">
            {#each request.modes as mode (mode)}<img
                src="/img/modes/mode-{mode}.png"
                alt=""
              />{/each}
          </span>
        </div>
        <div class="case-side">
          <button
            class="act"
            type="button"
            title="Dismiss"
            aria-label="Dismiss"
            onclick={() => (dismissing = request.id)}
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
          <a class="act go c-pink" href="/admin/ranking/{target}?set">Review set</a>
        </div>
        <p class="case-sub">
          {#if request.setId}<SetCreator
              setId={request.setId}
              after=" · "
            />{/if}{request.difficulties}
          {request.difficulties === 1 ? 'difficulty' : 'difficulties'} · requested by
          <a class="by" href="/admin/users/{request.requester.id}"
            ><Avatar id={request.requester.id} />{request.requester.username}</a
          >
          · <time>{timeAgo(request.time)}</time>
        </p>
      </article>
    {:else}
      <div class="empty-state">
        <i class="fa-solid fa-circle-check"></i>
        <b>The queue is empty</b>
      </div>
    {/each}
  </div>
  {#if list.state.data.pages > 1}
    <Pager
      page={current}
      pages={list.state.data.pages}
      hasNext={current < list.state.data.pages}
      onpage={(p) => goto(`/admin/requests${p > 1 ? `?p=${p}` : ''}`)}
    />
  {/if}
{:else if list.state.status === 'loading'}
  <div class="cases">
    {#each [0, 1, 2, 3] as n (n)}
      <span class="skel" style="width: 100%; height: 84px"></span>
    {/each}
  </div>
{:else}
  <p class="panel empty-note">{describe(list.state.error)}</p>
{/if}

<AdminDialog
  bind:open={
    () => dismissing !== null,
    (value) => {
      if (!value) dismissing = null;
    }
  }
  title="Dismiss this request?"
  colour="c-red"
>
  <p>It leaves the queue without changing the map. The player can request it again.</p>
  {#snippet footer()}
    <button class="btn" onclick={() => (dismissing = null)}>Cancel</button>
    <button class="btn btn-red" onclick={dismiss}>Dismiss</button>
  {/snippet}
</AdminDialog>
