<script lang="ts">
  import { page } from '$app/state';
  import { rankingSet, rankSet } from '$lib/api/admin';
  import type { RankStatus } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import Stars from '$lib/components/Stars.svelte';
  import { statusOf } from '$lib/beatmaps';
  import { flash } from '$lib/flash.svelte';

  const id = $derived(Number(page.params.id));
  const isSet = $derived(page.url.searchParams.has('set'));
  let version = $state(0);
  const set = query((signal) => {
    void version;
    return rankingSet(id, isSet, signal);
  });

  const valueOf = (ranked: number): RankStatus =>
    ranked === 2 || ranked === 3 ? 'ranked' : ranked === 5 ? 'loved' : 'unranked';

  let picks = $state<Record<number, RankStatus>>({});
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

  async function send(body: Parameters<typeof rankSet>[2], success: string) {
    busy = true;
    try {
      await rankSet(id, isSet, body);
      flash.show('success', success);
      version++;
      wholeSet = null;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }

  const options = [
    ['ranked', 'Ranked', 'c-lblue', 'fa-angles-up'],
    ['loved', 'Loved', 'c-pink', 'fa-heart'],
    ['unranked', 'Unranked', 'c-grey', 'fa-xmark']
  ] as const;

  // Set by the "every difficulty" buttons and cleared by any single change, so the whole-set call
  // (one Discord post) only runs when that's what was asked for.
  let wholeSet = $state<RankStatus | null>(null);

  function setAll(value: RankStatus) {
    if (set.state.status !== 'ready') return;
    picks = Object.fromEntries(set.state.data.difficulties.map((d) => [d.id, value]));
    wholeSet = value;
  }

  function save() {
    if (wholeSet) send({ all: wholeSet }, `Set ${wholeSet}.`);
    else send({ changes }, 'Beatmaps updated.');
  }

  const discard = () => {
    if (set.state.status !== 'ready') return;
    wholeSet = null;
    picks = Object.fromEntries(set.state.data.difficulties.map((d) => [d.id, valueOf(d.ranked)]));
  };
</script>

<a class="back" href="/admin/ranking"><i class="fa-solid fa-arrow-left"></i>Ranking</a>

{#if set.state.status === 'error'}
  <p class="panel empty-note">{describe(set.state.error)}</p>
{:else if set.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 150px"></span>
{:else}
  {@const data = set.state.data}
  {@const counts = options.map(([value, label, colour]) => ({
    label,
    colour,
    count: data.difficulties.filter((d) => valueOf(d.ranked) === value).length
  }))}
  <section class="user-head set-head-v2" style="background-image: url({data.cover})">
    <div class="user-top">
      <div class="user-who">
        <div class="user-name"><h1>{data.title}</h1></div>
        <div class="user-meta">
          {#if data.creator}<span>Mapped by <b>{data.creator}</b></span>{/if}
          <span>Set <b>{data.setId}</b></span>
          <span
            >{data.difficulties.length}
            {data.difficulties.length === 1 ? 'difficulty' : 'difficulties'}</span
          >
        </div>
        <div class="user-pills">
          {#each counts.filter((c) => c.count) as c (c.label)}
            <span class={c.colour}>{c.count} {c.label.toLowerCase()}</span>
          {/each}
        </div>
      </div>
      <div class="user-actions">
        <a class="btn" href="/beatmaps/{data.difficulties[0].id}">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>Beatmap
        </a>
      </div>
    </div>
  </section>

  <div class="whole-set">
    <span>Set every difficulty to</span>
    {#each options as [value, label, colour, icon] (value)}
      <button
        class="act {value === 'unranked' ? '' : `go ${colour}`}"
        type="button"
        onclick={() => setAll(value)}
      >
        <i class="fa-solid {icon}"></i>{label}
      </button>
    {/each}
  </div>

  <div class="table-wrap">
    <table class="board admin-table">
      <thead>
        <tr><th>Difficulty</th><th>Stars</th><th>Now</th><th>Change to</th><th></th></tr>
      </thead>
      <tbody>
        {#each data.difficulties as diff (diff.id)}
          {@const status = statusOf(diff.ranked)}
          <tr class:changed={picks[diff.id] !== valueOf(diff.ranked)}>
            <td>
              <span class="diff-name">
                <img src="/img/modes/mode-{diff.mode}.png" alt="" />{diff.name}
              </span>
            </td>
            <td><Stars value={diff.stars} /></td>
            <td>
              <span class="map-status {status.colour}">
                <i class="fa-solid {status.icon}"></i>{status.name}
              </span>
            </td>
            <td>
              <div class="status-pick" role="radiogroup" aria-label="Status of {diff.name}">
                {#each options as [value, label, colour, icon] (value)}
                  <label class={colour}>
                    <input
                      type="radio"
                      name="status-{diff.id}"
                      {value}
                      bind:group={picks[diff.id]}
                    />
                    <span><i class="fa-solid {icon}"></i>{label}</span>
                  </label>
                {/each}
              </div>
            </td>
            <td class="actions">
              <a
                class="btn btn-small"
                href="/beatmaps/{diff.id}"
                title="Beatmap page"
                aria-label="Beatmap page for {diff.name}"
              >
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if changes.length}
    <div class="save-bar">
      <span>{changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}</span>
      <button class="btn" type="button" onclick={discard}>Discard</button>
      <button class="btn btn-green" type="button" disabled={busy} onclick={save}>
        <i class="fa-solid fa-floppy-disk"></i>Save
      </button>
    </div>
  {/if}
{/if}
