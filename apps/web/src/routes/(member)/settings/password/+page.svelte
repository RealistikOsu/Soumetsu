<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { changePassword, myEmail } from '$lib/api/settings';
  import { emailPattern, passwordProblem } from '$lib/passwords';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  let email = $state('');
  let original = '';
  let newPassword = $state('');
  let current = $state('');
  let busy = $state(false);

  $effect(() => {
    myEmail().then((result) => {
      email = original = result.email;
    });
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!emailPattern.test(email.trim())) return flash.show('error', m.settings_invalid_email());
    if (newPassword) {
      const problem = await passwordProblem(newPassword);
      if (problem) return flash.show('error', problem);
    }

    busy = true;
    try {
      await changePassword({
        current_password: current,
        new_password: newPassword || undefined,
        new_email: email.trim() === original ? undefined : email.trim()
      });
      original = email.trim();
      newPassword = current = '';
      flash.show('success', m.settings_saved());
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={save}>
  <h2 class="section-title c-orange">
    <i class="fa-solid fa-key"></i>{m.settings_password_title()}
  </h2>
  <div class="panel form-panel c-orange">
    <div class="field">
      <label for="email">{m.settings_password_email()}</label>
      <input id="email" type="email" bind:value={email} placeholder={m.settings_email()} />
    </div>
    <div class="field">
      <label for="new-password">{m.settings_password_new()}</label>
      <input
        id="new-password"
        type="password"
        bind:value={newPassword}
        autocomplete="new-password"
      />
      <small>{m.settings_password_new_hint()}</small>
    </div>
    <div class="field">
      <label for="current-password">{m.settings_password_current()}</label>
      <input
        id="current-password"
        type="password"
        bind:value={current}
        autocomplete="current-password"
        required
      />
    </div>
  </div>
  <div class="form-actions">
    <button class="btn btn-blue" type="submit" disabled={busy}>{m.settings_save()}</button>
  </div>
</form>
