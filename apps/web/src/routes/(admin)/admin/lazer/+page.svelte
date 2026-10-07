<script lang="ts">
  import {
    addPoolEntry,
    lazerSettings,
    poolEntries,
    removePoolEntry,
    setLazerSettings
  } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { Privilege } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';
  import { modeNames } from '$lib/modes';

  let version = $state(0);
  let ruleset = $state(0);
  let poolMap = $state('');
  let poolStars = $state('');
  let busy = $state(false);

  const canSettings = $derived(
    !!(session.user && session.user.privileges & Privilege.AdminManageSetting)
  );
  const settings = query((signal) => {
    void version;
    return canSettings ? lazerSettings(signal) : Promise.resolve(null);
  });
  const pool = query((signal) => {
    void version;
    return poolEntries(ruleset, signal);
  });

  async function run(action: () => Promise<unknown>, success: string) {
    busy = true;
    try {
      await action();
      flash.show('success', success);
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }

  const setElo = (rankedPlayElo: boolean) =>
    run(
      () => setLazerSettings({ rankedPlayElo }),
      `Ranked play rating changes turned ${rankedPlayElo ? 'on' : 'off'}.`
    );

  const addToPool = () =>
    run(async () => {
      await addPoolEntry(ruleset, Number(poolMap), Number(poolStars) || undefined);
      poolMap = '';
      poolStars = '';
    }, 'Added to the pool.');
</script>

<AdminHead heading="Lazer" text="Ranked play settings and its map pool for osu!lazer." />

{#if settings.state.status === 'ready' && settings.state.data}
  <h2 class="section-title c-orange">
    <i class="fa-solid fa-scale-balanced"></i>Ranked play rating
  </h2>
  <div class="panel form-panel admin-form settings-form c-orange">
    <div class="setting">
      <div>
        <b>Rating changes</b>
        <p>
          When off, matches end without changing anyone's rating, and the history shows the same
          rating before and after.
        </p>
      </div>
      <label class="switch">
        <input
          type="checkbox"
          checked={settings.state.data.rankedPlayElo}
          disabled={busy}
          onchange={(event) => setElo(event.currentTarget.checked)}
        />
        <span></span>
      </label>
    </div>
  </div>
{/if}

<h2 class="section-title c-purple"><i class="fa-solid fa-layer-group"></i>Ranked play pool</h2>
<div class="panel form-panel c-purple admin-form">
  <div class="field-row">
    <div class="field">
      <label for="pool-ruleset">Ruleset</label>
      <select id="pool-ruleset" bind:value={ruleset}>
        {#each modeNames as name, index (index)}<option value={index}>{name}</option>{/each}
      </select>
    </div>
    <div class="field">
      <label for="pool-map">Beatmap ID</label>
      <input id="pool-map" type="number" min="1" bind:value={poolMap} />
    </div>
    <div class="field">
      <label for="pool-stars">Stars</label>
      <input
        id="pool-stars"
        type="number"
        min="0"
        step="0.01"
        placeholder="the map's own"
        bind:value={poolStars}
      />
    </div>
    <button class="btn btn-blue" type="button" disabled={busy || !poolMap} onclick={addToPool}>
      <i class="fa-solid fa-plus"></i>Add
    </button>
  </div>
</div>

<div class="table-wrap">
  <table class="board admin-table c-purple">
    <thead>
      <tr><th>Beatmap</th><th>Stars</th><th></th></tr>
    </thead>
    <tbody>
      {#if pool.state.status === 'ready'}
        {#each pool.state.data as entry (entry.beatmapId)}
          <tr>
            <td class="note">
              <a href="/b/{entry.beatmapId}">{entry.song ?? `#${entry.beatmapId}`}</a>
            </td>
            <td>{entry.stars.toFixed(2)}</td>
            <td>
              <button
                class="btn btn-small"
                type="button"
                disabled={busy}
                onclick={() =>
                  run(() => removePoolEntry(ruleset, entry.beatmapId), 'Removed from the pool.')}
              >
                Remove
              </button>
            </td>
          </tr>
        {:else}
          <tr><td colspan="3" class="empty-note">No maps in this pool.</td></tr>
        {/each}
      {:else if pool.state.status === 'loading'}
        <tr><td colspan="3"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
      {:else}
        <tr><td colspan="3" class="empty-note">{describe(pool.state.error)}</td></tr>
      {/if}
    </tbody>
  </table>
</div>
