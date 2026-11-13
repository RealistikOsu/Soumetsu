<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { apiUrl } from '$lib/api/client';
  import { m } from '$lib/paraglide/messages';

  let container = $state<HTMLDivElement>();
  let failed = $state(false);

  // Scalar reads ?api= itself when it starts, so switching reloads the page rather than the reference.
  const version = $derived(page.url.searchParams.get('api') === 'v1' ? 'v1' : 'v2');

  // Scalar brings its own Vue app and a large stylesheet, so it only loads on this page.
  onMount(() => {
    let destroy = () => {};
    Promise.all([import('@scalar/api-reference'), import('@scalar/api-reference/style.css')])
      .then(([{ createApiReference }]) => {
        if (!container) return;
        destroy = createApiReference(container, {
          sources: [
            {
              title: 'v2',
              slug: 'v2',
              url: apiUrl('/api/v2/openapi.json').href,
              default: true,
              agent: { disabled: true }
            },
            {
              title: 'v1 (legacy)',
              slug: 'v1',
              url: '/openapi/v1.json',
              agent: { disabled: true }
            }
          ],
          theme: 'none',
          forceDarkModeState: 'dark',
          hideDarkModeToggle: true,
          withDefaultFonts: false,
          telemetry: false,
          showDeveloperTools: 'never',
          documentDownloadType: 'json'
        }).destroy;
      })
      .catch(() => (failed = true));
    return () => destroy();
  });
</script>

<svelte:head><title>{m.support_api_title()} · RealistikOsu</title></svelte:head>

<header class="api-bar">
  <a class="logo" href="/"><img src="/img/logo.png" alt="RealistikOsu" /></a>
  <b>{m.support_api_title()}</b>
  <nav class="api-switch">
    <a href="?api=v2" data-sveltekit-reload class:active={version === 'v2'}>v2</a>
    <a href="?api=v1" data-sveltekit-reload class:active={version === 'v1'}>
      v1 <small>{m.support_api_legacy()}</small>
    </a>
  </nav>
  <a class="api-back" href="/"><i class="fa-solid fa-arrow-left"></i>{m.support_api_back()}</a>
</header>

{#if failed}
  <p class="api-failed">{m.support_api_error()}</p>
{:else}
  <div class="api-docs" bind:this={container}></div>
{/if}
