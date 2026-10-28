<script lang="ts">
  import { banchoSettings, saveBanchoSettings } from '$lib/api/admin';
  import type { BanchoSettings } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { countChanges } from '$lib/components/admin/changes';
  import SaveBar from '$lib/components/admin/SaveBar.svelte';
  import { flash } from '$lib/flash.svelte';

  const loaded = query((signal) => banchoSettings(signal));

  let form = $state<BanchoSettings | null>(null);
  let saving = $state(false);

  $effect(() => {
    if (loaded.state.status === 'ready') form = { ...loaded.state.data };
  });

  const loadedForm = $derived(loaded.state.status === 'ready' ? loaded.state.data : null);
  const changes = $derived(countChanges(form, loadedForm));

  // The setting holds the image, and optionally the page it opens, separated by a bar.
  const icon = $derived(form?.menuIcon.split('|')[0].trim() ?? '');

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!form) return;
    saving = true;
    try {
      await saveBanchoSettings(form);
      flash.show('success', 'Bancho settings were successfully edited!');
      loaded.reload();
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
  <form onsubmit={save}>
    <section class="user-box">
      <h2>Login</h2>
      <div class="set-row">
        <div>
          <b>Maintenance</b>
          <p>Stops players logging in from the client. Staff still can.</p>
        </div>
        <label class="switch">
          <input type="checkbox" bind:checked={form.maintenance} /><span></span>
        </label>
      </div>
      <div class="field">
        <label for="menuicon">Menu icon</label>
        <div class="framed-input">
          <i class="fa-solid fa-image"></i>
          <input id="menuicon" maxlength="512" bind:value={form.menuIcon} />
          {#if icon}<img class="framed-thumb" src={icon} alt="" />{/if}
        </div>
        <small>
          Image link shown on the client's main menu, optionally followed by | and the page it
          opens.
        </small>
      </div>
      <div class="field">
        <label for="loginnotif">Login notification</label>
        <textarea id="loginnotif" rows="3" maxlength="512" bind:value={form.loginNotification}
        ></textarea>
        <small>Pops up in the client every time someone logs in.</small>
      </div>
    </section>
    <SaveBar {changes} busy={saving} ondiscard={() => loadedForm && (form = { ...loadedForm })} />
  </form>
{:else}
  <span class="skel" style="width: 100%; height: 260px"></span>
{/if}
