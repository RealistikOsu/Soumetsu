<script lang="ts">
  import Banner from './Banner.svelte';
</script>

<svelte:head>
  <title>User not found · RealistikOsu</title>
</svelte:head>

<Banner image="not-found.jpg" class="error-banner">
  <div>
    <span class="error-code">Profile</span>
    <h1>User not found</h1>
  </div>
</Banner>

<main class="wrap error">
  <p class="lead">
    That user could not be found. They might have changed their name, or their account might be
    restricted.
  </p>
  <p class="muted">Try one of these instead:</p>
  <nav class="error-links">
    <a class="c-blue" href="/"><i class="fa-solid fa-house"></i>Home</a>
    <a class="c-yellow" href="/leaderboard"><i class="fa-solid fa-trophy"></i>Leaderboard</a>
    <a class="c-lblue" href="/beatmap_listing"><i class="fa-solid fa-music"></i>Beatmaps</a>
    <a class="c-green" href="/doc"><i class="fa-solid fa-book"></i>Documentation</a>
  </nav>
</main>
