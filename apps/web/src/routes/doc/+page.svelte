<script lang="ts">
  import { docs } from '$lib/api/docs';
  import { query } from '$lib/api/query.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import { m } from '$lib/paraglide/messages';

  const list = query((signal) => docs(signal));
</script>

<svelte:head><title>{m.support_doc_title()} · RealistikOsu</title></svelte:head>

<Banner image="docs.jpg">
  <div>
    <h1>{m.support_doc_title()}</h1>
    <p class="sub">{m.support_doc_sub()}</p>
  </div>
</Banner>

<main class="wrap docs-index">
  {#if list.state.status === 'ready'}
    {#each list.state.data as item (item.slug)}
      <a class="panel doc-card c-{item.colour}" href="/doc/{item.slug}">
        <i class="fa-solid fa-{item.icon}"></i>
        <div>
          <b>{item.title}</b>
          <p>{item.description}</p>
        </div>
      </a>
    {/each}
  {:else if list.state.status === 'error'}
    <p class="panel empty-note">{m.support_doc_error()}</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 90px"></span></div>
  {/if}
  <p class="docs-help">
    {m.support_doc_help()} <a href="/discord">{m.support_doc_help_link()}</a>.
  </p>
</main>
