<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    bancho,
    finishBancho,
    startBancho,
    unlinkBancho,
    type BanchoLink
  } from '$lib/api/linking';
  import { describe } from '$lib/api/messages';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  let data = $state.raw<BanchoLink | null>(null);
  let failed = $state(false);
  let busy = $state(false);

  // osu! sends the player back here with a code and the state value from when they left.
  $effect(() => {
    const code = page.url.searchParams.get('code');
    const state = page.url.searchParams.get('state');
    const refused = page.url.searchParams.has('error');
    const load = () =>
      bancho().then(
        (result) => (data = result),
        () => (failed = true)
      );

    if (refused) {
      flash.show('warning', m.settings_bancho_cancelled());
      goto('/settings/bancho', { replaceState: true });
      return void load();
    }
    if (!code || !state) return void load();

    goto('/settings/bancho', { replaceState: true });
    finishBancho(code, state).then(
      () => {
        flash.show('success', m.settings_bancho_linked());
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
      location.href = await startBancho();
    } catch (error) {
      flash.show('error', describe(error));
      busy = false;
    }
  }

  async function unlink() {
    busy = true;
    try {
      await unlinkBancho();
      data = data && { ...data, link: null };
      flash.show('success', m.settings_bancho_unlinked());
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<h2 class="section-title c-lblue"><i class="fa-solid fa-link"></i>{m.settings_tab_bancho()}</h2>
<div class="panel link-card {data?.link ? 'linked' : ''} c-lblue">
  <span class="link-icon"><i class="fa-solid fa-link"></i></span>
  {#if failed}
    <div><p>{m.settings_bancho_load_failed()}</p></div>
  {:else if !data}
    <div><span class="skel" style="width: 160px"></span></div>
  {:else if data.link}
    <div>
      <h2>
        <a href="https://osu.ppy.sh/users/{data.link.id}" target="_blank" rel="noopener noreferrer">
          {data.link.username}
        </a>
      </h2>
      <p>{m.settings_bancho_linked_note()}</p>
    </div>
    <button class="btn" type="button" disabled={busy} onclick={unlink}>{m.settings_unlink()}</button
    >
  {:else}
    <div>
      <h2>{m.settings_not_linked()}</h2>
      <p>{m.settings_bancho_link_prompt()}</p>
    </div>
    <button class="btn btn-blue" type="button" disabled={busy} onclick={connect}>
      <i class="fa-solid fa-link"></i>{m.settings_bancho_link()}
    </button>
  {/if}
</div>
