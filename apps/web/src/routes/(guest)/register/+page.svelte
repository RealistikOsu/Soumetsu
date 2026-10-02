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
  import {
    emailPattern,
    forbiddenUsernames,
    passwordProblem,
    usernameProblem
  } from '$lib/passwords';
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
      (forbiddenUsernames.has(name.toLowerCase())
        ? "You're not allowed to register with that username."
        : null) ??
      (emailPattern.test(email.trim()) ? null : 'Please pass a valid email address.') ??
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
      flash.next(
        'success',
        'You have been successfully registered on RealistikOsu! You now need to verify your account.'
      );
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
  heading="Register"
  sub={count.state.status === 'ready'
    ? `Join ${count.state.data.registered_users.toLocaleString('en')} players on RealistikOsu.`
    : 'Join the players on RealistikOsu.'}
  colour="c-green"
  icon="fa-user-plus"
  title="Create an account"
>
  {#snippet card()}
    <Journey current={1} />
    {#if site.info && !site.info.registrationsEnabled}
      <p class="auth-sub">
        Sorry, it's not possible to register at the moment. Please try again later.
      </p>
    {:else}
      <form class="auth-form" onsubmit={submit}>
        <div class="field">
          <label for="username">Username</label>
          <input
            id="username"
            type="text"
            bind:value={username}
            placeholder="eg. RealistikBot"
            autocomplete="username"
            required
          />
          <small>2 to 15 characters: letters, numbers, spaces and <code>_ [ ] -</code></small>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="eg. realistikbot@ussr.pl"
            autocomplete="email"
            required
          />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            minlength="8"
            autocomplete="new-password"
            required
          />
          <small>At least 8 characters.</small>
        </div>
        <div class="field">
          <label for="password-confirm">Confirm password</label>
          <input
            id="password-confirm"
            type="password"
            bind:value={confirm}
            autocomplete="new-password"
            required
          />
          {#if mismatch}<small class="error">Both passwords must match.</small>{/if}
        </div>
        <Captcha bind:token={captcha} />
        <button class="btn btn-green" type="submit" disabled={busy}>Register</button>
      </form>
      <p class="auth-switch">Already have one? <a href="/login">Log in</a></p>
    {/if}
  {/snippet}
  {#snippet aside()}
    <SectionTitle colour="c-yellow" icon="fa-star">What you get</SectionTitle>
    <div class="panel form-panel grow c-yellow"><Features /></div>
    <StackedCounters />
    <h2 class="section-title c-discord"><i class="fa-brands fa-discord"></i>Questions?</h2>
    <a class="discord" href="/discord">
      Ask on our Discord<small>Hangout with people who get it</small>
    </a>
  {/snippet}
</AuthLayout>
