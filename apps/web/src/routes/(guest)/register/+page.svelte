<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { registerAccount, registerCheck } from '$lib/api/auth';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import Captcha from '$lib/components/Captcha.svelte';
  import Features from '$lib/components/Features.svelte';
  import Journey from '$lib/components/Journey.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import StackedCounters from '$lib/components/StackedCounters.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';
  import {
    emailPattern,
    forbiddenUsernames,
    passwordProblem,
    usernameProblem
  } from '$lib/passwords';
  import { number } from '$lib/format';
  import { site } from '$lib/site.svelte';
  import { stats as loadStats } from '$lib/api/stats';

  let username = $state('');
  let email = $state('');
  let password = $state('');
  let confirm = $state('');
  let captcha = $state('');
  let busy = $state(false);

  // Someone already registered from this address or browser sees the multiaccount warning first.
  const known = query((signal) => registerCheck(signal));
  const count = query((signal) => loadStats(signal));
  const skipWarning = $derived(page.url.searchParams.get('stopsign') === '1');

  $effect(() => {
    if (!skipWarning && known.state.status === 'ready' && known.state.data.username) {
      goto(`/register/stop?name=${encodeURIComponent(known.state.data.username)}`, {
        replaceState: true
      });
    }
  });

  const mismatch = $derived(confirm !== '' && confirm !== password);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const name = username.trim();
    const problem =
      usernameProblem(name) ??
      (forbiddenUsernames.has(name.toLowerCase()) ? m.auth_register_forbidden() : null) ??
      (emailPattern.test(email.trim()) ? null : m.auth_invalid_email()) ??
      (await passwordProblem(password));
    if (problem) return flash.show('error', problem);
    if (mismatch) return;

    busy = true;
    try {
      const created = await registerAccount({
        username: name,
        email: email.trim(),
        password,
        captcha: captcha || undefined
      });
      flash.next('success', m.auth_register_done());
      await goto(`/register/verify?u=${created.user_id}`);
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<AuthLayout
  image="register.jpg"
  heading={m.auth_register()}
  sub={count.state.status === 'ready'
    ? m.auth_register_sub_count({
        count: count.state.data.registered_users,
        formatted: number(count.state.data.registered_users)
      })
    : m.auth_register_sub()}
  colour="c-green"
  icon="fa-user-plus"
  title={m.auth_register_title()}
>
  {#snippet card()}
    <Journey current={1} />
    {#if site.info && !site.info.registrationsEnabled}
      <p class="auth-sub">{m.auth_register_closed()}</p>
    {:else}
      <form class="auth-form" onsubmit={submit}>
        <div class="field">
          <label for="username">{m.auth_username()}</label>
          <input
            id="username"
            type="text"
            bind:value={username}
            placeholder={m.auth_username_placeholder()}
            autocomplete="username"
            required
          />
          <small>{m.auth_register_username_hint()} <code>_ [ ] -</code></small>
        </div>
        <div class="field">
          <label for="email">{m.auth_email()}</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder={m.auth_email_placeholder()}
            autocomplete="email"
            required
          />
        </div>
        <div class="field">
          <label for="password">{m.auth_password()}</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            minlength="8"
            autocomplete="new-password"
            required
          />
          <small>{m.auth_password_min()}</small>
        </div>
        <div class="field">
          <label for="password-confirm">{m.auth_register_confirm()}</label>
          <input
            id="password-confirm"
            type="password"
            bind:value={confirm}
            autocomplete="new-password"
            required
          />
          {#if mismatch}<small class="error">{m.auth_register_mismatch()}</small>{/if}
        </div>
        <Captcha bind:token={captcha} />
        <button class="btn btn-green" type="submit" disabled={busy}>{m.auth_register()}</button>
      </form>
      <p class="auth-switch">
        {m.auth_register_have_account()} <a href="/login">{m.auth_log_in()}</a>
      </p>
    {/if}
  {/snippet}
  {#snippet aside()}
    <SectionTitle colour="c-yellow" icon="fa-star">{m.auth_register_perks()}</SectionTitle>
    <div class="panel form-panel grow c-yellow"><Features /></div>
    <StackedCounters />
    <h2 class="section-title c-discord">
      <i class="fa-brands fa-discord"></i>{m.auth_register_questions()}
    </h2>
    <a class="discord" href="/discord">
      {m.auth_ask_discord()}<small>{m.auth_register_discord_hint()}</small>
    </a>
  {/snippet}
</AuthLayout>
