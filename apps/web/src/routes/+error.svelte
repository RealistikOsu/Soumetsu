<script lang="ts">
  import { page } from '$app/state';
  import Banner from '$lib/components/Banner.svelte';
  import { m } from '$lib/paraglide/messages';

  const notFound = $derived(page.status === 404);
  const title = $derived(notFound ? m.common_errorpage_not_found() : m.common_errorpage_broken());
</script>

<svelte:head>
  <title>{title} · RealistikOsu</title>
</svelte:head>

<Banner image="not-found.jpg" class="error-banner">
  <div>
    <span class="error-code">{page.status}</span>
    <h1>{title}</h1>
  </div>
</Banner>

<main class="wrap error">
  {#if notFound}
    <p class="lead">{m.common_errorpage_not_found_text()}</p>
    <p class="muted">{m.common_try_instead()}</p>
  {:else}
    <p class="lead">{m.common_errorpage_broken_text()}</p>
    <div class="avatar-actions">
      <button class="btn btn-blue" type="button" onclick={() => location.reload()}>
        <i class="fa-solid fa-rotate-right"></i>{m.common_errorpage_try_again()}
      </button>
      <a class="btn" href="/discord">
        <i class="fa-brands fa-discord"></i>{m.common_errorpage_report()}
      </a>
    </div>
  {/if}
  <nav class="error-links">
    <a class="c-blue" href="/"><i class="fa-solid fa-house"></i>{m.common_nav_home()}</a>
    <a class="c-yellow" href="/leaderboard">
      <i class="fa-solid fa-trophy"></i>{m.common_nav_leaderboard()}
    </a>
    <a class="c-lblue" href="/beatmap_listing">
      <i class="fa-solid fa-music"></i>{m.common_nav_beatmaps()}
    </a>
    <a class="c-green" href="/doc"><i class="fa-solid fa-book"></i>{m.common_nav_documentation()}</a
    >
  </nav>
</main>
