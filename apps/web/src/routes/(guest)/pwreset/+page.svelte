<script lang="ts">
  import { goto } from '$app/navigation';
  import { requestReset } from '$lib/api/auth';
  import { describe } from '$lib/api/messages';
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import Captcha from '$lib/components/Captcha.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  let username = $state('');
  let captcha = $state('');
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await requestReset(username.trim(), captcha || undefined);
      flash.next('success', m.auth_pwreset_sent());
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
  heading={m.auth_pwreset_heading()}
  sub={m.auth_pwreset_sub()}
  colour="c-orange"
  icon="fa-envelope"
  title={m.auth_pwreset_title()}
>
  {#snippet card()}
    <p class="auth-sub">{m.auth_pwreset_intro()}</p>
    <form class="auth-form" onsubmit={submit}>
      <div class="field">
        <label for="username">{m.auth_username_or_email()}</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder={m.auth_username_placeholder()}
          required
        />
      </div>
      <Captcha bind:token={captcha} />
      <button class="btn btn-orange" type="submit" disabled={busy}>{m.auth_pwreset_submit()}</button
      >
    </form>
  {/snippet}
  {#snippet aside()}
    <SectionTitle colour="c-blue" icon="fa-key">{m.auth_pwreset_remembered()}</SectionTitle>
    <div class="panel new-here c-blue">
      <p>{m.auth_pwreset_remembered_text()}</p>
      <div class="avatar-actions">
        <a class="btn btn-blue" href="/login"
          ><i class="fa-solid fa-right-to-bracket"></i>{m.auth_log_in()}</a
        >
      </div>
    </div>
    <h2 class="section-title c-discord">
      <i class="fa-brands fa-discord"></i>{m.auth_still_stuck()}
    </h2>
    <a class="discord" href="/discord">
      {m.auth_ask_discord()}<small>{m.auth_pwreset_discord_hint()}</small>
    </a>
  {/snippet}
</AuthLayout>
