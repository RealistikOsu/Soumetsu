<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import Banner from './Banner.svelte';
</script>

<svelte:head>
  <title>{m.common_user_not_found_title()} · RealistikOsu</title>
</svelte:head>

<Banner image="not-found.jpg" class="error-banner">
  <div>
    <span class="error-code">{m.common_header_profile()}</span>
    <h1>{m.common_user_not_found_title()}</h1>
  </div>
</Banner>

<main class="wrap error">
  <p class="lead">
    {m.common_user_not_found_text()}
  </p>
  <p class="muted">{m.common_try_instead()}</p>
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
