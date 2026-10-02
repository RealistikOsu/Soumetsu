<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { changeUsername } from '$lib/api/settings';
  import { isSupporter } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import SupporterOnly from '$lib/components/SupporterOnly.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';
  import { usernameProblem } from '$lib/passwords';

  let username = $state('');
  let busy = $state(false);

  const supporter = $derived(!!session.user && isSupporter(session.user.privileges));

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const name = username.trim();
    const problem = usernameProblem(name);
    if (problem) return flash.show('error', problem);
    if (name === session.user?.username) return flash.show('error', m.settings_username_same());

    busy = true;
    try {
      await changeUsername(name);
      flash.show('success', m.settings_username_changed());
      username = '';
      await session.start();
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<h2 class="section-title c-red"><i class="fa-solid fa-pen"></i>{m.settings_tab_username()}</h2>
{#if !supporter}
  <SupporterOnly />
{:else}
  <form onsubmit={save}>
    <div class="notice warning">
      <i class="fa-solid fa-triangle-exclamation notice-icon"></i>
      <div>{m.settings_username_warning()}</div>
    </div>
    <div class="panel form-panel c-red">
      <div class="field">
        <label for="new-username">{m.settings_username_new()}</label>
        <input
          id="new-username"
          type="text"
          bind:value={username}
          placeholder={session.user?.username}
        />
        <small>{m.settings_username_cooldown()}</small>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy}
        >{m.settings_username_change()}</button
      >
    </div>
  </form>
{/if}
