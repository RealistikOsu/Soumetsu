<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { siteApi } from '$lib/api/client';
  import { session } from '$lib/auth/session.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import { m } from '$lib/paraglide/messages';

  // osu! opens this when bancho wants the computer verified: the client hash names the hardware.
  const ch = $derived(page.url.searchParams.get('ch') ?? '');

  let step = $state<'ready' | 'busy' | 'done' | 'not-needed' | 'setup' | 'relogin' | 'error'>(
    'ready'
  );
  let error = $state('');

  $effect(() => {
    if (!session.ready || session.user) return;
    goto(`/login?redir=${encodeURIComponent(page.url.pathname + page.url.search)}`, {
      replaceState: true
    });
  });

  async function approve() {
    step = 'busy';
    try {
      const result = await siteApi.post<{ needed: boolean }>('/client-verifications', { ch });
      step = result.needed ? 'done' : 'not-needed';
    } catch (cause) {
      const code = isApiError(cause) ? cause.code : '';
      if (code === 'site.two_factor_setup_needed') step = 'setup';
      else if (code === 'site.two_factor_login_needed') step = 'relogin';
      else {
        error = describe(cause);
        step = 'error';
      }
    }
  }

  async function relogin() {
    await session.logout();
    await goto(`/login?redir=${encodeURIComponent(page.url.pathname + page.url.search)}`);
  }
</script>

<svelte:head><title>{m.auth_client_verify_title()} · RealistikOsu</title></svelte:head>

<Banner image="login.jpg">
  <div>
    <h1>{m.auth_client_verify_title()}</h1>
    <p class="sub">{m.auth_client_verify_sub()}</p>
  </div>
</Banner>

<main class="wrap connect">
  {#if session.user}
    <div class="panel form-panel c-blue client-verify">
      {#if step === 'done'}
        <p><i class="fa-solid fa-circle-check"></i> {m.auth_client_verify_done()}</p>
      {:else if step === 'not-needed'}
        <p>{m.auth_client_verify_not_needed()}</p>
      {:else if step === 'setup'}
        <p>{m.auth_client_verify_setup()}</p>
        <a class="btn btn-blue" href="/settings/2fa">{m.auth_client_verify_setup_link()}</a>
      {:else if step === 'relogin'}
        <p>{m.auth_client_verify_relogin()}</p>
        <button class="btn btn-blue" type="button" onclick={relogin}>
          {m.auth_client_verify_relogin_button()}
        </button>
      {:else}
        <p>{m.auth_client_verify_intro({ name: session.user.username })}</p>
        <p class="muted">{m.auth_client_verify_warning()}</p>
        {#if step === 'error'}<p class="dialog-note">{error}</p>{/if}
        <button
          class="btn btn-blue"
          type="button"
          disabled={step === 'busy' || !ch}
          onclick={approve}
        >
          <i class="fa-solid fa-shield-halved"></i>{m.auth_client_verify_approve()}
        </button>
      {/if}
    </div>
  {/if}
</main>
