<script lang="ts">
  import { page } from '$app/state';
  import { rankingSet, rankSet } from '$lib/api/admin';
  import type { RankStatus } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminDialog from '$lib/components/admin/AdminDialog.svelte';
  import Stars from '$lib/components/Stars.svelte';
  import { statusOf } from '$lib/beatmaps';
  import { flash } from '$lib/flash.svelte';

  const id = $derived(Number(page.params.id));
  let version = $state(0);
  const set = query((signal) => {
    void version;
    return rankingSet(id, signal);
  });

  const valueOf = (ranked: number): RankStatus =>
    ranked === 2 || ranked === 3 ? 'ranked' : ranked === 5 ? 'loved' : 'unranked';

  let picks = $state<Record<number, RankStatus>>({});
  let dialog = $state<RankStatus | null>(null);
  let busy = $state(false);

  $effect(() => {
    if (set.state.status !== 'ready') return;
    picks = Object.fromEntries(set.state.data.difficulties.map((d) => [d.id, valueOf(d.ranked)]));
  });

  const changes = $derived(
    set.state.status === 'ready'
      ? set.state.data.difficulties
          .filter((d) => picks[d.id] && picks[d.id] !== valueOf(d.ranked))
          .map((d) => ({ beatmapId: d.id, status: picks[d.id] }))
      : []
  );

  async function send(body: Parameters<typeof rankSet>[1], success: string) {
    busy = true;
    try {
      await rankSet(id, body);
      flash.show('success', success);
      version++;
      dialog = null;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }

  const words = {
    ranked: [
      'Rank the whole set?',
      'Every difficulty becomes ranked and starts giving pp. The ranking webhook posts it on Discord.',
      'Rank set'
    ],
    loved: [
      'Love the whole set?',
      'Every difficulty becomes loved. Loved maps give no pp.',
      'Love set'
    ],
    unranked: [
      'Unrank the whole set?',
      'Every difficulty goes back to unranked and stops giving pp.',
      'Unrank set'
    ]
  } as const;
</script>

<a class="back" href="/admin/ranking"><i class="fa-solid fa-arrow-left"></i>Ranking</a>

{#if set.state.status === 'error'}
  <p class="panel empty-note">{describe(set.state.error)}</p>
{:else if set.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 150px"></span>
{:else}
  {@const data = set.state.data}
  <section class="panel set-head c-lblue" style="--cover:url({data.cover})">
    <div class="score-bg"></div>
    <div>
      <h1>{data.title}</h1>
      <p>
        {#if data.creator}mapped by <b>{data.creator}</b> ·
        {/if}set {data.setId}
      </p>
    </div>
    <div class="set-actions">
      <button class="btn btn-blue" type="button" onclick={() => (dialog = 'ranked')}>
        <i class="fa-solid fa-angles-up"></i>Rank set
      </button>
      <button class="btn" type="button" onclick={() => (dialog = 'loved')}>
        <i class="fa-solid fa-heart"></i>Love set
      </button>
      <button class="btn" type="button" onclick={() => (dialog = 'unranked')}>
        <i class="fa-solid fa-xmark"></i>Unrank set
      </button>
    </div>
  </section>

  <h2 class="section-title c-lblue"><i class="fa-solid fa-layer-group"></i>Difficulties</h2>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      send({ changes }, 'Beatmaps updated.');
    }}
  >
    <div class="table-wrap">
      <table class="board admin-table c-lblue">
        <thead>
          <tr>
            <th>Difficulty</th>
            <th>Stars</th>
            <th>Now</th>
            <th>Change to</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.difficulties as diff (diff.id)}
            {@const status = statusOf(diff.ranked)}
            <tr>
              <td
                ><img
                  class="mode-icon"
                  src="/img/modes/mode-{diff.mode}.png"
                  alt=""
                />{diff.name}</td
              >
              <td><Stars value={diff.stars} /></td>
              <td>
                <span class="map-status {status.colour}">
                  <i class="fa-solid {status.icon}"></i>{status.name}
                </span>
              </td>
              <td class="field">
                <select
                  id="status-{diff.id}"
                  aria-label="Status of {diff.name}"
                  bind:value={picks[diff.id]}
                >
                  <option value="ranked">Ranked</option>
                  <option value="loved">Loved</option>
                  <option value="unranked">Unranked</option>
                </select>
              </td>
              <td class="actions">
                <a class="btn btn-small" href="/beatmaps/{diff.id}">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>Page
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="form-actions">
      <button class="btn btn-green" type="submit" disabled={busy || !changes.length}>
        <i class="fa-solid fa-floppy-disk"></i>Save changes
      </button>
    </div>
  </form>

  {#each ['ranked', 'loved', 'unranked'] as const as status (status)}
    <AdminDialog
      bind:open={
        () => dialog === status,
        (value) => {
          if (!value && dialog === status) dialog = null;
        }
      }
      title={words[status][0]}
      colour="c-red"
    >
      <p>{words[status][1]}</p>
      {#snippet footer()}
        <button class="btn" onclick={() => (dialog = null)}>Cancel</button>
        <button
          class="btn btn-red"
          disabled={busy}
          onclick={() => send({ all: status }, `Set ${status}.`)}
        >
          {words[status][2]}
        </button>
      {/snippet}
    </AdminDialog>
  {/each}
{/if}
