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
  import { m } from '$lib/paraglide/messages';

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
      flash.next('success', m.auth_login_welcome({ name: session.user?.username ?? '' }));
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
      flash.next('warning', m.auth_login_verify_first());
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
  heading={m.auth_log_in()}
  sub={m.auth_login_sub()}
  colour="c-blue"
  icon="fa-right-to-bracket"
  title={m.auth_login_title()}
>
  {#snippet card()}
    <form class="auth-form" onsubmit={submit}>
      <div class="field">
        <label for="username">{m.auth_username_or_email()}</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder={m.auth_username_placeholder()}
          autocomplete="username"
          required
        />
      </div>
      <div class="field">
        <span class="label-row"
          ><label for="password">{m.auth_password()}</label><a href="/pwreset"
            >{m.auth_login_forgot()}</a
          ></span
        >
        <input
          id="password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          required
        />
      </div>
      <button class="btn btn-blue" type="submit" disabled={busy}>{m.auth_log_in()}</button>
    </form>
  {/snippet}
  {#snippet aside()}
    <SectionTitle colour="c-green" icon="fa-seedling">{m.auth_login_new_here()}</SectionTitle>
    <div class="panel new-here c-green">
      <Journey current={0} />
      <p>{m.auth_login_new_here_text()}</p>
      <div class="avatar-actions">
        <a class="btn btn-green" href="/register"
          ><i class="fa-solid fa-user-plus"></i>{m.auth_register()}</a
        >
        <a class="btn" href="/connect">{m.auth_login_how_to_connect()}</a>
      </div>
    </div>
    <StackedCounters />
  {/snippet}
</AuthLayout>
