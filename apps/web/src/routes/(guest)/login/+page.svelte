<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { resumeVerification } from '$lib/api/auth';
  import { isApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { session } from '$lib/auth/session.svelte';
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import Journey from '$lib/components/Journey.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import StackedCounters from '$lib/components/StackedCounters.svelte';
  import { flash } from '$lib/flash.svelte';

  let username = $state('');
  let password = $state('');
  let busy = $state(false);

  // Only paths on this site, never another address.
  const redirect = $derived.by(() => {
    const target = page.url.searchParams.get('redir') ?? '';
    return target.startsWith('/') && !target.startsWith('//') ? target : '/';
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await session.login(username.trim(), password);
      flash.next(
        'success',
        `Welcome back ${session.user?.username}! You have been logged into RealistikOsu!`
      );
      await goto(redirect);
    } catch (error) {
      await handle(error);
    } finally {
      busy = false;
    }
  }

  async function handle(error: unknown) {
    const code = isApiError(error) ? error.code : '';
    if (code === 'auth.account_pending') {
      const id = await resumeVerification(username.trim(), password).catch(() => null);
      flash.next('warning', 'You will need to verify your account first.');
      return goto(id ? `/register/verify?u=${id}` : '/');
    }
    if (code === 'auth.password_version_old') {
      flash.next('warning', describe(error));
      return goto('/pwreset');
    }
    flash.show('error', describe(error));
  }
</script>

<AuthLayout
  image="login.jpg"
  heading="Log in"
  sub="Welcome back."
  colour="c-blue"
  icon="fa-right-to-bracket"
  title="Your account"
>
  {#snippet card()}
    <form class="auth-form" onsubmit={submit}>
      <div class="field">
        <label for="username">Username or email</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder="eg. RealistikBot"
          autocomplete="username"
          required
        />
      </div>
      <div class="field">
        <span class="label-row"
          ><label for="password">Password</label><a href="/pwreset">Forgot it?</a></span
        >
        <input
          id="password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          required
        />
      </div>
      <button class="btn btn-blue" type="submit" disabled={busy}>Log in</button>
    </form>
  {/snippet}
  {#snippet aside()}
    <SectionTitle colour="c-green" icon="fa-seedling">New here?</SectionTitle>
    <div class="panel new-here c-green">
      <Journey current={0} />
      <p>Make an account, connect with the osu! client and you're on the leaderboards.</p>
      <div class="avatar-actions">
        <a class="btn btn-green" href="/register"><i class="fa-solid fa-user-plus"></i>Register</a>
        <a class="btn" href="/connect">How to connect</a>
      </div>
    </div>
    <StackedCounters />
  {/snippet}
</AuthLayout>
