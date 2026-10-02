<script lang="ts">
  import { env } from '$env/dynamic/public';

  interface HCaptcha {
    render: (
      node: HTMLElement,
      options: {
        sitekey: string;
        theme: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
      }
    ) => string;
    reset: (id?: string) => void;
  }

  let { token = $bindable('') }: { token?: string } = $props();

  const siteKey = env.PUBLIC_HCAPTCHA_SITE_KEY;
  const setToken = (value: string) => {
    token = value;
  };
  let node = $state<HTMLElement>();

  // The hCaptcha script is loaded once, the first time a form that needs it is shown.
  function load() {
    return new Promise<HCaptcha>((resolve) => {
      const existing = (window as unknown as { hcaptcha?: HCaptcha }).hcaptcha;
      if (existing) return resolve(existing);
      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve((window as unknown as { hcaptcha: HCaptcha }).hcaptcha);
      document.head.append(script);
    });
  }

  $effect(() => {
    if (!siteKey || !node) return;
    const target = node;
    load().then((hcaptcha) => {
      hcaptcha.render(target, {
        sitekey: siteKey,
        theme: 'dark',
        callback: (value) => setToken(value),
        'expired-callback': () => setToken('')
      });
    });
  });
</script>

{#if siteKey}<div class="captcha" bind:this={node}></div>{/if}
