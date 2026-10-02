<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { changePassword, myEmail } from '$lib/api/settings';
  import { emailPattern, passwordProblem } from '$lib/passwords';
  import { flash } from '$lib/flash.svelte';

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
    if (!emailPattern.test(email.trim()))
      return flash.show('error', 'Please pass a valid email address.');
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
      flash.show('success', 'Your settings have been saved.');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={save}>
  <h2 class="section-title c-orange"><i class="fa-solid fa-key"></i>Password and email</h2>
  <div class="panel form-panel c-orange">
    <div class="field">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} placeholder="Email address" />
    </div>
    <div class="field">
      <label for="new-password">New password</label>
      <input
        id="new-password"
        type="password"
        bind:value={newPassword}
        autocomplete="new-password"
      />
      <small>Leave it blank if you don't want to change it.</small>
    </div>
    <div class="field">
      <label for="current-password">Current password</label>
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
    <button class="btn btn-blue" type="submit" disabled={busy}>Save</button>
  </div>
</form>
