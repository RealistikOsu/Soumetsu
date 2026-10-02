<script lang="ts">
  import { page } from '$app/state';
  import Banner from '$lib/components/Banner.svelte';

  const notFound = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{notFound ? 'Page not found' : 'Something went wrong'} · RealistikOsu</title>
</svelte:head>

<Banner image="not-found.jpg" class="error-banner">
  <div>
    <span class="error-code">{page.status}</span>
    <h1>{notFound ? 'Page not found' : 'Something went wrong'}</h1>
  </div>
</Banner>

<main class="wrap error">
  {#if notFound}
    <p class="lead">
      We couldn't find what you were looking for. It may have moved, or the link might be wrong.
    </p>
    <p class="muted">Try one of these instead:</p>
  {:else}
    <p class="lead">
      Something broke on our end while handling your request. Trying again often works. If it keeps
      happening, let a developer know.
    </p>
    <div class="avatar-actions">
      <button class="btn btn-blue" type="button" onclick={() => location.reload()}>
        <i class="fa-solid fa-rotate-right"></i>Try again
      </button>
      <a class="btn" href="/discord"><i class="fa-brands fa-discord"></i>Report it on Discord</a>
    </div>
  {/if}
  <nav class="error-links">
    <a class="c-blue" href="/"><i class="fa-solid fa-house"></i>Home</a>
    <a class="c-yellow" href="/leaderboard"><i class="fa-solid fa-trophy"></i>Leaderboard</a>
    <a class="c-lblue" href="/beatmap_listing"><i class="fa-solid fa-music"></i>Beatmaps</a>
    <a class="c-green" href="/doc"><i class="fa-solid fa-book"></i>Documentation</a>
  </nav>
</main>
