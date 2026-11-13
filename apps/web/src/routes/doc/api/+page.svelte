<script lang="ts">
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/api/client';
  import Banner from '$lib/components/Banner.svelte';
  import { m } from '$lib/paraglide/messages';

  let container = $state<HTMLDivElement>();
  let failed = $state(false);

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

<Banner image="docs.jpg">
  <div>
    <a class="crumb" href="/doc"><i class="fa-solid fa-arrow-left"></i>{m.support_doc_title()}</a>
    <h1>{m.support_api_title()}</h1>
    <p class="sub">{m.support_api_sub()}</p>
  </div>
</Banner>

{#if failed}
  <main class="wrap docs-index"><p class="panel empty-note">{m.support_api_error()}</p></main>
{:else}
  <div class="api-docs" bind:this={container}></div>
{/if}
