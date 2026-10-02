<script lang="ts">
  import { goto } from '$app/navigation';
  import { requestReset } from '$lib/api/auth';
  import { describe } from '$lib/api/messages';
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import Captcha from '$lib/components/Captcha.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';

  let username = $state('');
  let captcha = $state('');
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await requestReset(username.trim(), captcha || undefined);
      flash.next('success', 'Done! You should receive an email to your original mailbox shortly!');
      await goto('/');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<AuthLayout
  image="login.jpg"
  heading="Password reset"
  sub="Forgot your password? It happens."
  colour="c-orange"
  icon="fa-envelope"
  title="Send a reset link"
>
  {#snippet card()}
    <p class="auth-sub">
      Tell us your username or email. We'll send a link to the email you signed up with, and you
      continue from there.
    </p>
    <form class="auth-form" onsubmit={submit}>
      <div class="field">
        <label for="username">Username or email</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder="eg. RealistikBot"
          required
        />
      </div>
      <Captcha bind:token={captcha} />
      <button class="btn btn-orange" type="submit" disabled={busy}>Send reset link</button>
    </form>
  {/snippet}
  {#snippet aside()}
    <SectionTitle colour="c-blue" icon="fa-key">Remembered it?</SectionTitle>
    <div class="panel new-here c-blue">
      <p>Head back and log in as usual.</p>
      <div class="avatar-actions">
        <a class="btn btn-blue" href="/login"><i class="fa-solid fa-right-to-bracket"></i>Log in</a>
      </div>
    </div>
    <h2 class="section-title c-discord"><i class="fa-brands fa-discord"></i>Still stuck?</h2>
    <a class="discord" href="/discord">
      Ask on our Discord<small>Staff can help if the email never shows up</small>
    </a>
  {/snippet}
</AuthLayout>
