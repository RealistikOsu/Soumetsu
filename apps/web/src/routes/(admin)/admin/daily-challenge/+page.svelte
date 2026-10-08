<script lang="ts">
  import { dailyChallenges, removeDailyChallenge, setDailyChallenge } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';

  const tomorrow = `${new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}T06:00`;

  let version = $state(0);
  let beatmap = $state('');
  let startsAt = $state(tomorrow);
  let freemod = $state(false);
  let busy = $state(false);

  const daily = query((signal) => {
    void version;
    return dailyChallenges(signal);
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

  const save = () =>
    run(() => setDailyChallenge(startsAt, Number(beatmap), freemod), 'Daily challenge saved.');
</script>

<AdminHead
  heading="Daily challenge"
  text="One osu!standard map per day, for stable and lazer. It runs for 24 hours from its start (all times are UTC). Changes to the running challenge apply straight away."
/>

<div class="panel form-panel c-teal admin-form">
  <div class="field-row">
    <div class="field">
      <label for="challenge-start">Starts (UTC)</label>
      <input id="challenge-start" type="datetime-local" bind:value={startsAt} />
    </div>
    <div class="field">
      <label for="challenge-map">Beatmap ID</label>
      <input id="challenge-map" type="number" min="1" bind:value={beatmap} />
    </div>
    <div class="field">
      <span class="label">Freemod</span>
      <label class="switch">
        <input type="checkbox" bind:checked={freemod} />
        <span></span>
      </label>
    </div>
    <button
      class="btn btn-blue"
      type="button"
      disabled={busy || !beatmap || !startsAt}
      onclick={save}
    >
      <i class="fa-solid fa-floppy-disk"></i>Save
    </button>
  </div>
  <small class="dim">
    The challenge ends 24 hours after it starts, or when the next one starts. A day has one
    challenge, so saving another start on the same UTC date replaces it. The map stays hidden from
    players until it starts. Freemod takes every mod, and vanilla, Relax and Autopilot plays share
    the board; without it only scores without mods count.
  </small>
</div>

<div class="table-wrap">
  <table class="board admin-table c-teal">
    <thead>
      <tr><th>Date</th><th>Beatmap</th><th>Starts (UTC)</th><th>Mods</th><th></th></tr>
    </thead>
    <tbody>
      {#if daily.state.status === 'ready'}
        {#each daily.state.data as challenge (challenge.date)}
          <tr>
            <td>{challenge.date}</td>
            <td class="note">
              <a href="/b/{challenge.beatmapId}">{challenge.song ?? `#${challenge.beatmapId}`}</a>
            </td>
            <td class="dim">{challenge.startsAt.replace('T', ' ')}</td>
            <td class="dim">{challenge.freemod ? 'Freemod' : 'No mods'}</td>
            <td class="actions">
              <button
                class="btn btn-small"
                type="button"
                disabled={busy}
                onclick={() => {
                  beatmap = String(challenge.beatmapId);
                  startsAt = challenge.startsAt;
                  freemod = challenge.freemod;
                }}
              >
                Edit
              </button>
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
          <tr><td colspan="5" class="empty-note">Nothing scheduled.</td></tr>
        {/each}
      {:else if daily.state.status === 'loading'}
        <tr><td colspan="5"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
      {:else}
        <tr><td colspan="5" class="empty-note">{describe(daily.state.error)}</td></tr>
      {/if}
    </tbody>
  </table>
</div>
