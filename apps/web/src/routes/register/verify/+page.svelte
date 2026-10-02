<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { registerStatus } from '$lib/api/auth';
  import Banner from '$lib/components/Banner.svelte';
  import ConnectMethods from '$lib/components/ConnectMethods.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  const id = $derived(Number(page.url.searchParams.get('u')));

  // The account verifies itself the first time the game client logs in, so the page watches for that.
  $effect(() => {
    const user = id;
    let stopped = false;
    const leave = (message: string) => {
      flash.next('warning', message);
      goto('/', { replaceState: true });
    };

    async function poll() {
      if (stopped) return;
      try {
        const status = await registerStatus(user);
        if (status === 'pending') return void (timer = setTimeout(poll, 4000));
        goto(`/register/welcome?u=${user}`, { replaceState: true });
      } catch {
        leave(m.auth_nope());
      }
    }
    let timer = setTimeout(poll, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  });
</script>

<svelte:head><title>{m.auth_verify_title()} · RealistikOsu</title></svelte:head>

<Banner image="register.jpg">
  <div>
    <h1>{m.auth_verify_heading()}</h1>
    <p class="sub">{m.auth_verify_sub()}</p>
  </div>
</Banner>

<main class="wrap connect">
  <div class="notice">
    <i class="fa-solid fa-envelope-circle-check notice-icon"></i>
    <div>
      <b>{m.auth_verify_no_email()}</b>
      {m.auth_verify_explain()}
    </div>
  </div>

  <ConnectMethods />

  <div class="panel waiting c-blue">
    <i class="fa-solid fa-circle-notch fa-spin"></i>
    {m.auth_verify_waiting()}
  </div>
</main>
