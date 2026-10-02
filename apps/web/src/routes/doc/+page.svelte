<script lang="ts">
  import { docs } from '$lib/api/docs';
  import { query } from '$lib/api/query.svelte';
  import Banner from '$lib/components/Banner.svelte';

  const list = query((signal) => docs(signal));
</script>

<svelte:head><title>Documentation · RealistikOsu</title></svelte:head>

<Banner image="docs.jpg">
  <div>
    <h1>Documentation</h1>
    <p class="sub">Need help getting around? Start here.</p>
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
    <p class="panel empty-note">Couldn't load the documentation. Try again in a bit.</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 90px"></span></div>
  {/if}
  <p class="docs-help">Can't find what you need? <a href="/discord">Ask on our Discord</a>.</p>
</main>
