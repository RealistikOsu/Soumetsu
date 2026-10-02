<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { doc, docs } from '$lib/api/docs';
  import { query } from '$lib/api/query.svelte';
  import { bbcodeBoxes } from '$lib/bbcode';
  import Banner from '$lib/components/Banner.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { renderDoc } from '$lib/docs/render';

  const slug = $derived(page.params.slug ?? '');
  const list = query((signal) => docs(signal));
  const current = query((signal) => doc(slug, signal));

  // The numeric ids the old site used (/doc/9) still open their page.
  $effect(() => {
    if (!/^\d+$/.test(slug) || list.state.status !== 'ready') return;
    const match = list.state.data.find((d) => d.oldId === Number(slug));
    if (match) goto(`/doc/${match.slug}`, { replaceState: true });
  });

  const rendered = $derived(
    current.state.status === 'ready' ? renderDoc(current.state.data.body) : null
  );
  const meta = $derived(current.state.status === 'ready' ? current.state.data.meta : null);
</script>

<svelte:head>
  <title>{meta ? `${meta.title} · Documentation` : 'Documentation'} · RealistikOsu</title>
</svelte:head>

{#if current.state.status === 'error'}
  <NotFound />
{:else}
  <Banner image="docs.jpg">
    <div>
      <a class="crumb" href="/doc"><i class="fa-solid fa-arrow-left"></i>Documentation</a>
      <h1>{meta?.title ?? '…'}</h1>
      <p class="sub">{meta?.description ?? ''}</p>
    </div>
  </Banner>

  <main class="wrap doc">
    <aside class="doc-side">
      <nav class="settings-menu docs-menu">
        {#if list.state.status === 'ready'}
          {#each list.state.data as item (item.slug)}
            <a class="c-{item.colour} {item.slug === slug ? 'active' : ''}" href="/doc/{item.slug}">
              <i class="fa-solid fa-{item.icon}"></i>{item.title}
            </a>
          {/each}
        {/if}
      </nav>
      {#if rendered?.sections.length}
        <div class="doc-toc">
          <span>On this page</span>
          {#each rendered.sections as section (section.id)}
            <a href="#{section.id}">{section.title}</a>
          {/each}
        </div>
      {/if}
    </aside>
    <article class="panel doc-body c-{meta?.colour ?? 'blue'}" use:bbcodeBoxes>
      {#if rendered}
        {@html rendered.html}
      {:else}
        <span class="skel" style="width: 100%; height: 200px"></span>
      {/if}
    </article>
  </main>
{/if}
