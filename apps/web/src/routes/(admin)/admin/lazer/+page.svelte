<script lang="ts">
  import {
    addPoolEntry,
    dailyChallenges,
    lazerSettings,
    poolEntries,
    removeDailyChallenge,
    removePoolEntry,
    setDailyChallenge,
    setLazerSettings
  } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { Privilege } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';
  import { modeNames } from '$lib/modes';

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  let version = $state(0);
  let ruleset = $state(0);
  let date = $state(tomorrow);
  let challengeMap = $state('');
  let poolMap = $state('');
  let poolStars = $state('');
  let busy = $state(false);

  const daily = query((signal) => {
    void version;
    return dailyChallenges(signal);
  });
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

  const saveChallenge = () =>
    run(() => setDailyChallenge(date, Number(challengeMap)), 'Daily challenge saved.');

  const addToPool = () =>
    run(async () => {
      await addPoolEntry(ruleset, Number(poolMap), Number(poolStars) || undefined);
      poolMap = '';
      poolStars = '';
    }, 'Added to the pool.');
</script>

<AdminHead
  heading="Lazer"
  text="The daily challenge and the ranked play map pool for osu!lazer. Changes to today's challenge apply straight away."
/>

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

<h2 class="section-title c-teal"><i class="fa-solid fa-calendar-day"></i>Daily challenge</h2>
<div class="panel form-panel c-teal admin-form">
  <div class="field-row">
    <div class="field">
      <label for="challenge-date">Date (UTC)</label>
      <input id="challenge-date" type="date" bind:value={date} />
    </div>
    <div class="field">
      <label for="challenge-map">Beatmap ID</label>
      <input id="challenge-map" type="number" min="1" bind:value={challengeMap} />
    </div>
    <button
      class="btn btn-blue"
      type="button"
      disabled={busy || !challengeMap || !date}
      onclick={saveChallenge}
    >
      <i class="fa-solid fa-floppy-disk"></i>Save
    </button>
  </div>
</div>

<div class="table-wrap">
  <table class="board admin-table c-teal">
    <thead>
      <tr><th>Date</th><th>Beatmap</th><th></th></tr>
    </thead>
    <tbody>
      {#if daily.state.status === 'ready'}
        {#each daily.state.data as challenge (challenge.date)}
          <tr>
            <td>{challenge.date}</td>
            <td class="note">
              <a href="/b/{challenge.beatmapId}">{challenge.song ?? `#${challenge.beatmapId}`}</a>
            </td>
            <td>
              <button
                class="btn btn-small"
                type="button"
                disabled={busy}
                onclick={() =>
                  run(() => removeDailyChallenge(challenge.date), 'Daily challenge removed.')}
              >
                Remove
              </button>
            </td>
          </tr>
        {:else}
          <tr><td colspan="3" class="empty-note">Nothing scheduled.</td></tr>
        {/each}
      {:else if daily.state.status === 'loading'}
        <tr><td colspan="3"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
      {:else}
        <tr><td colspan="3" class="empty-note">{describe(daily.state.error)}</td></tr>
      {/if}
    </tbody>
  </table>
</div>

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
