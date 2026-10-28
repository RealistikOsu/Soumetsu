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
  let theme = $state('');
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
      () => setDailyChallenge(startsAt, Number(beatmap), freemod, theme),
      'Daily challenge saved.'
    );

  const today = new Date().toISOString().slice(0, 10);
</script>

<AdminHead
  heading="Daily challenge"
  text="One osu!standard map per day, for stable and lazer. It runs for 24 hours from its start (all times are UTC). Changes to the running challenge apply straight away."
/>

<section class="user-box">
  <h2>Schedule a challenge <small>Saving on a day that has one replaces it</small></h2>
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
      <label for="challenge-theme">Theme</label>
      <input
        id="challenge-theme"
        type="text"
        maxlength="100"
        placeholder="None"
        bind:value={theme}
      />
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
      <i class="fa-solid fa-plus"></i>Schedule
    </button>
  </div>
  <small class="faint">
    The challenge ends 24 hours after it starts, or when the next one starts. The map stays hidden
    from players until it starts. Freemod takes every mod, and vanilla, Relax and Autopilot plays
    share the board; without it only scores without mods count.
  </small>
</section>

<h2 class="day-label suggest-label">Scheduled</h2>
{#if daily.state.status === 'ready'}
  <div class="cases">
    {#each daily.state.data as challenge (challenge.date)}
      <article class="case flat">
        <div class="case-line">
          <span
            class="admin-tag {challenge.date === today
              ? 'c-green'
              : challenge.date > today
                ? 'c-teal'
                : 'c-grey'}"
          >
            {challenge.date === today ? 'Today' : challenge.date}
          </span>
          <a href="/b/{challenge.beatmapId}">{challenge.song ?? `#${challenge.beatmapId}`}</a>
          {#if challenge.theme}<span class="admin-tag c-teal">{challenge.theme}</span>{/if}
        </div>
        <div class="case-side">
          <button
            class="act"
            type="button"
            disabled={busy}
            onclick={() => {
              beatmap = String(challenge.beatmapId);
              startsAt = challenge.startsAt;
              freemod = challenge.freemod;
              theme = challenge.theme ?? '';
            }}
          >
            Edit
          </button>
          <button
            class="act"
            type="button"
            aria-label="Remove"
            disabled={busy}
            onclick={() =>
              run(() => removeDailyChallenge(challenge.date), 'Daily challenge removed.')}
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <p class="case-sub">
          Starts {challenge.startsAt.replace('T', ' ')} UTC · {challenge.freemod
            ? 'Freemod'
            : 'No mods'}
        </p>
      </article>
    {:else}
      <p class="panel empty-note">Nothing scheduled.</p>
    {/each}
  </div>
{:else if daily.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 120px"></span>
{:else}
  <p class="panel empty-note">{describe(daily.state.error)}</p>
{/if}
