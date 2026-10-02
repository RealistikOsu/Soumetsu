<script lang="ts">
  import { banchoSettings, saveBanchoSettings } from '$lib/api/admin';
  import type { BanchoSettings } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';

  const loaded = query((signal) => banchoSettings(signal));

  let form = $state<BanchoSettings | null>(null);
  let saving = $state(false);

  $effect(() => {
    if (loaded.state.status === 'ready') form = { ...loaded.state.data };
  });

  // The setting holds the image, and optionally the page it opens, separated by a bar.
  const icon = $derived(form?.menuIcon.split('|')[0].trim() ?? '');

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!form) return;
    saving = true;
    try {
      await saveBanchoSettings(form);
      flash.show('success', 'Bancho settings were successfully edited!');
    } catch (error) {
      flash.show('error', describe(error));
    }
    saving = false;
  }
</script>

<AdminHead heading="Bancho settings" text="What players see when they log in from the client." />

{#if loaded.state.status === 'error'}
  <p class="panel empty-note">{describe(loaded.state.error)}</p>
{:else if form}
  <form class="panel form-panel admin-form settings-form c-yellow" onsubmit={save}>
    <div class="setting">
      <div>
        <b>Maintenance</b>
        <p>Stops players from logging in from the client. Staff still can.</p>
      </div>
      <label class="switch">
        <input type="checkbox" bind:checked={form.maintenance} /><span></span>
      </label>
    </div>
    <div class="field">
      <label for="menuicon">Menu icon</label>
      <div class="icon-field">
        <input id="menuicon" maxlength="512" bind:value={form.menuIcon} />
        {#if icon}<img src={icon} alt="" />{/if}
      </div>
      <small>
        Image link shown on the client's main menu, optionally followed by | and the page it opens.
      </small>
    </div>
    <div class="field">
      <label for="loginnotif">Login notification</label>
      <textarea id="loginnotif" rows="3" maxlength="512" bind:value={form.loginNotification}
      ></textarea>
      <small>Pops up in the client every time someone logs in.</small>
    </div>
    <div class="form-actions">
      <button class="btn btn-green" type="submit" disabled={saving}>
        <i class="fa-solid fa-floppy-disk"></i>Save
      </button>
    </div>
  </form>
{:else}
  <span class="skel" style="width: 100%; height: 260px"></span>
{/if}
