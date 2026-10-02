<script lang="ts">
  import { saveSystemSettings, systemSettings } from '$lib/api/admin';
  import type { SystemSettings } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';
  import { sanitise } from '$lib/sanitise';
  import { site } from '$lib/site.svelte';

  const loaded = query((signal) => systemSettings(signal));

  let form = $state<SystemSettings | null>(null);
  let saving = $state(false);

  $effect(() => {
    if (loaded.state.status === 'ready') form = { ...loaded.state.data };
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!form) return;
    saving = true;
    try {
      await saveSystemSettings(form);
      flash.show('success', 'Successfully edited the system settings!');
      await site.load();
    } catch (error) {
      flash.show('error', describe(error));
    }
    saving = false;
  }

  const switches = [
    ['websiteMaintenance', 'Website maintenance', 'Only staff can use the website.'],
    [
      'gameMaintenance',
      'Score submission maintenance',
      "Players can play, but scores aren't saved."
    ],
    ['registrations', 'Registrations', 'New players can make accounts.']
  ] as const;
</script>

<AdminHead
  heading="System settings"
  text="Switches for the whole server, and the alerts shown on the website."
/>

{#if loaded.state.status === 'error'}
  <p class="panel empty-note">{describe(loaded.state.error)}</p>
{:else if form}
  <form class="panel form-panel admin-form settings-form c-orange" onsubmit={save}>
    {#each switches as [key, title, text] (key)}
      <div class="setting">
        <div>
          <b>{title}</b>
          <p>{text}</p>
        </div>
        <label class="switch"><input type="checkbox" bind:checked={form[key]} /><span></span></label
        >
      </div>
    {/each}
    <div class="field">
      <label for="globalalert">Global alert <span class="faint">(HTML)</span></label>
      <textarea id="globalalert" rows="3" maxlength="512" bind:value={form.globalAlert}></textarea>
      <small>Shown on every page.</small>
      <div class="alert-preview" hidden={!form.globalAlert.trim()}>
        <span class="faint">Preview</span>
        <div class="notice alert c-blue">
          <i class="fa-solid fa-circle-info notice-icon"></i>
          <div>
            <b>Something interesting for you about RealistikOsu...</b>
            {@html sanitise(form.globalAlert)}
          </div>
        </div>
      </div>
    </div>
    <div class="field">
      <label for="homealert">Home page alert <span class="faint">(HTML)</span></label>
      <textarea
        id="homealert"
        rows="3"
        maxlength="512"
        placeholder="Empty, so nothing shows"
        bind:value={form.homeAlert}></textarea>
      <small>Shown on the home page only.</small>
      <div class="alert-preview" hidden={!form.homeAlert.trim()}>
        <span class="faint">Preview</span>
        <div class="notice alert c-blue">
          <i class="fa-solid fa-circle-info notice-icon"></i>
          <div>{@html sanitise(form.homeAlert)}</div>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-green" type="submit" disabled={saving}>
        <i class="fa-solid fa-floppy-disk"></i>Save
      </button>
    </div>
  </form>
{:else}
  <span class="skel" style="width: 100%; height: 300px"></span>
{/if}
