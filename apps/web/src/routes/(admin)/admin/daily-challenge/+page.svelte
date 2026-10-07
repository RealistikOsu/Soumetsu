<script lang="ts">
  import { dailyChallenges, removeDailyChallenge, setDailyChallenge } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  let version = $state(0);
  let date = $state(tomorrow);
  let beatmap = $state('');
  let startsAt = $state('');
  let endsAt = $state('');
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
    run(
      () => setDailyChallenge(date, Number(beatmap), startsAt || null, endsAt || null),
      'Daily challenge saved.'
    );

  const runs = (startsAt: string | null, endsAt: string | null) =>
    startsAt || endsAt
      ? `${startsAt?.replace('T', ' ') ?? 'start of the day'} to ${endsAt?.replace('T', ' ') ?? 'a day later'}`
      : 'The whole day';
</script>

<AdminHead
  heading="Daily challenge"
  text="One osu!standard map per day, for stable and lazer. It runs for its UTC day unless you give it a start and an end (all times are UTC). Changes to the running challenge apply straight away."
/>

<div class="panel form-panel c-teal admin-form">
  <div class="field-row">
    <div class="field">
      <label for="challenge-date">Date (UTC)</label>
      <input id="challenge-date" type="date" bind:value={date} />
    </div>
    <div class="field">
      <label for="challenge-map">Beatmap ID</label>
      <input id="challenge-map" type="number" min="1" bind:value={beatmap} />
    </div>
  </div>
  <div class="field-row">
    <div class="field">
      <label for="challenge-start">Starts (UTC, optional)</label>
      <input id="challenge-start" type="datetime-local" bind:value={startsAt} />
    </div>
    <div class="field">
      <label for="challenge-end">Ends (UTC, optional)</label>
      <input id="challenge-end" type="datetime-local" bind:value={endsAt} />
    </div>
    <button class="btn btn-blue" type="button" disabled={busy || !beatmap || !date} onclick={save}>
      <i class="fa-solid fa-floppy-disk"></i>Save
    </button>
  </div>
  <small class="dim">
    Leave both empty for the whole UTC day. A start alone runs for 24 hours from it. The map stays
    hidden from players until the challenge starts.
  </small>
</div>

<div class="table-wrap">
  <table class="board admin-table c-teal">
    <thead>
      <tr><th>Date</th><th>Beatmap</th><th>Runs</th><th></th></tr>
    </thead>
    <tbody>
      {#if daily.state.status === 'ready'}
        {#each daily.state.data as challenge (challenge.date)}
          <tr>
            <td>{challenge.date}</td>
            <td class="note">
              <a href="/b/{challenge.beatmapId}">{challenge.song ?? `#${challenge.beatmapId}`}</a>
            </td>
            <td class="dim">{runs(challenge.startsAt, challenge.endsAt)}</td>
            <td class="actions">
              <button
                class="btn btn-small"
                type="button"
                disabled={busy}
                onclick={() => {
                  date = challenge.date;
                  beatmap = String(challenge.beatmapId);
                  startsAt = challenge.startsAt ?? '';
                  endsAt = challenge.endsAt ?? '';
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
          <tr><td colspan="4" class="empty-note">Nothing scheduled.</td></tr>
        {/each}
      {:else if daily.state.status === 'loading'}
        <tr><td colspan="4"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
      {:else}
        <tr><td colspan="4" class="empty-note">{describe(daily.state.error)}</td></tr>
      {/if}
    </tbody>
  </table>
</div>
