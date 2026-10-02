<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { dismissRequest, rankRequests } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminDialog from '$lib/components/admin/AdminDialog.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
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
  text="Maps players want ranked. Reviewing opens the whole set."
/>

<div class="table-wrap">
  <table class="board admin-table c-pink">
    <thead>
      <tr>
        <th>Map</th>
        <th>Modes</th>
        <th class="player">Requested by</th>
        <th>When</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if list.state.status === 'ready'}
        {#each list.state.data.requests as request (request.id)}
          {@const target = request.setId ?? 0}
          <tr>
            <td class="song-cell">
              <a class="request-map" href="/admin/ranking/{target}">
                {#if request.cover}<img src={request.cover} alt="" loading="lazy" />{/if}
                <span>
                  <b>{request.song}</b>
                  <small>
                    {#if request.setId}<SetCreator
                        setId={request.setId}
                        after=" · "
                      />{/if}{request.difficulties}
                    {request.difficulties === 1 ? 'difficulty' : 'difficulties'}
                  </small>
                </span>
              </a>
            </td>
            <td class="modes-cell">
              {#each request.modes as mode (mode)}<img
                  src="/img/modes/mode-{mode}.png"
                  alt=""
                />{/each}
            </td>
            <td class="player">
              <a class="who" href="/users/{request.requester.id}">
                <Flag country={request.requester.country} /><Avatar id={request.requester.id} /><b>
                  {request.requester.username}
                </b>
              </a>
            </td>
            <td class="dim">{timeAgo(request.time)}</td>
            <td class="actions">
              <a class="btn btn-small" href="/admin/ranking/{target}">
                <i class="fa-solid fa-angles-up"></i>Review
              </a>
              <button
                class="btn btn-small btn-icon"
                type="button"
                title="Dismiss request"
                aria-label="Dismiss request"
                onclick={() => (dismissing = request.id)}
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </td>
          </tr>
        {:else}
          <tr><td colspan="5" class="empty-note">The queue is empty.</td></tr>
        {/each}
      {:else if list.state.status === 'loading'}
        {#each [0, 1, 2, 3, 4, 5] as n (n)}
          <tr><td colspan="5"><span class="skel" style="width: 100%; height: 36px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="5" class="empty-note">{describe(list.state.error)}</td></tr>
      {/if}
    </tbody>
  </table>
</div>

{#if list.state.status === 'ready' && list.state.data.pages > 1}
  <Pager
    page={current}
    pages={list.state.data.pages}
    hasNext={current < list.state.data.pages}
    onpage={(p) => goto(`/admin/requests${p > 1 ? `?p=${p}` : ''}`)}
  />
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
