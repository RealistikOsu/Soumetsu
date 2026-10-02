<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    finishTwitch,
    saveTwitch,
    startTwitch,
    twitch,
    unlinkTwitch,
    type TwitchLink
  } from '$lib/api/linking';
  import { describe } from '$lib/api/messages';
  import { flash } from '$lib/flash.svelte';

  let data = $state.raw<TwitchLink | null>(null);
  let failed = $state(false);
  let busy = $state(false);

  let enabled = $state(true);
  let echo = $state(true);
  let subOnly = $state(false);
  let pointsOnly = $state(false);
  let cooldown = $state(30);
  let starFilter = $state(false);
  let starMin = $state(0);
  let starMax = $state(10);
  let excluded = $state('');

  function fill(result: TwitchLink) {
    data = result;
    const s = result.settings;
    if (!s) return;
    ({ enabled, echo, subOnly, pointsOnly, cooldown, starFilter, starMin, starMax } = s);
    excluded = s.excluded.join('\n');
  }

  // Twitch sends the player back here with a code and the state value from when they left.
  $effect(() => {
    const code = page.url.searchParams.get('code');
    const state = page.url.searchParams.get('state');
    const load = () => twitch().then(fill, () => (failed = true));

    if (page.url.searchParams.has('error')) {
      flash.show('warning', 'Twitch authorisation was cancelled.');
      goto('/settings/twitch', { replaceState: true });
      return void load();
    }
    if (!code || !state) return void load();

    goto('/settings/twitch', { replaceState: true });
    finishTwitch(code, state).then(
      () => {
        flash.show('success', 'Successfully linked your Twitch account!');
        return load();
      },
      (error) => {
        flash.show('error', describe(error));
        return load();
      }
    );
  });

  async function connect() {
    busy = true;
    try {
      location.href = await startTwitch();
    } catch (error) {
      flash.show('error', describe(error));
      busy = false;
    }
  }

  async function unlink() {
    busy = true;
    try {
      await unlinkTwitch();
      data = data && { ...data, link: null, settings: null };
      flash.show('success', 'Your Twitch account has been unlinked.');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await saveTwitch({
        enabled,
        echo,
        subOnly,
        pointsOnly,
        cooldown,
        starFilter,
        starMin,
        starMax,
        excluded
      });
      flash.show('success', 'Your beatmap request settings have been saved!');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<h2 class="section-title c-purple"><i class="fa-brands fa-twitch"></i>Twitch requests</h2>
<div class="panel link-card {data?.link ? 'linked' : ''} c-purple">
  <span class="link-icon"><i class="fa-brands fa-twitch"></i></span>
  {#if failed}
    <div><p>Couldn't load your Twitch link. Try again in a bit.</p></div>
  {:else if !data}
    <div><span class="skel" style="width: 160px"></span></div>
  {:else if data.link}
    <div>
      <h2>{data.link.username}</h2>
      <p>Twitch account linked</p>
    </div>
    <button class="btn" type="button" disabled={busy} onclick={unlink}>Unlink account</button>
  {:else}
    <div>
      <h2>Not linked</h2>
      <p>Link your Twitch account to take beatmap requests in chat.</p>
    </div>
    <button class="btn btn-blue" type="button" disabled={busy} onclick={connect}>
      <i class="fa-brands fa-twitch"></i>Link Twitch
    </button>
  {/if}
</div>

{#if data?.link}
  <form onsubmit={save}>
    <h2 class="section-title c-purple"><i class="fa-solid fa-sliders"></i>Request settings</h2>
    <div class="panel form-panel c-purple">
      <label class="switch">
        <input type="checkbox" bind:checked={enabled} /><span></span>Accept beatmap requests
      </label>
      <label class="switch">
        <input type="checkbox" bind:checked={echo} /><span></span>Confirm each request in Twitch
        chat
      </label>
      <label class="switch">
        <input type="checkbox" bind:checked={subOnly} /><span></span>Subscribers only (mods and VIPs
        always allowed)
      </label>
      <label class="switch">
        <input type="checkbox" bind:checked={pointsOnly} /><span></span>Channel point redemptions
        only
      </label>
      <div class="field">
        <label for="cooldown">Cooldown per viewer</label>
        <input id="cooldown" type="number" min="0" max="3600" bind:value={cooldown} />
        <small>In seconds. 0 turns it off.</small>
      </div>
      <label class="switch">
        <input type="checkbox" bind:checked={starFilter} /><span></span>Only accept maps within a
        star rating range
      </label>
      {#if starFilter}
        <div class="field-row">
          <div class="field">
            <label for="sr-min">Minimum stars</label>
            <input id="sr-min" type="number" step="0.1" min="0" max="20" bind:value={starMin} />
          </div>
          <div class="field">
            <label for="sr-max">Maximum stars</label>
            <input id="sr-max" type="number" step="0.1" min="0" max="20" bind:value={starMax} />
          </div>
        </div>
      {/if}
      <div class="field">
        <label for="blocked">Blocked viewers</label>
        <textarea id="blocked" rows="4" bind:value={excluded}></textarea>
        <small>One Twitch username per line.</small>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy}>Save settings</button>
    </div>
  </form>
{/if}
