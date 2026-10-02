<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { doc, docs } from '$lib/api/docs';
  import { query } from '$lib/api/query.svelte';
  import { bbcodeBoxes } from '$lib/bbcode';
  import Banner from '$lib/components/Banner.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { renderDoc } from '$lib/docs/render';
  import { m } from '$lib/paraglide/messages';

  const slug = $derived(page.params.slug ?? '');
  const list = query((signal) => docs(signal));
  const forced = $derived(page.url.searchParams.get('lang') ?? undefined);
  const current = query((signal) => doc(slug, signal, forced));

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
  <title
    >{meta ? `${meta.title} · ${m.support_doc_title()}` : m.support_doc_title()} · RealistikOsu</title
  >
</svelte:head>

{#if current.state.status === 'error'}
  <NotFound />
{:else}
  <Banner image="docs.jpg">
    <div>
      <a class="crumb" href="/doc"><i class="fa-solid fa-arrow-left"></i>{m.support_doc_title()}</a>
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
          <span>{m.support_doc_on_this_page()}</span>
          {#each rendered.sections as section (section.id)}
            <a href="#{section.id}">{section.title}</a>
          {/each}
        </div>
      {/if}
    </aside>
    <article class="panel doc-body c-{meta?.colour ?? 'blue'}" use:bbcodeBoxes>
      {#if current.state.status === 'ready' && current.state.data.outdated}
        <div class="callout c-yellow">
          <p class="callout-title">
            <i class="fa-solid fa-language"></i>{m.support_doc_outdated_title()}
          </p>
          <p>
            {m.support_doc_outdated_before()}<a href="/doc/{slug}?lang=en"
              >{m.support_doc_outdated_link()}</a
            >{m.support_doc_outdated_after()}
          </p>
        </div>
      {/if}
      {#if rendered}
        {@html rendered.html}
      {:else}
        <span class="skel" style="width: 100%; height: 200px"></span>
      {/if}
    </article>
  </main>
{/if}
