<script lang="ts">
  import Banner from '$lib/components/Banner.svelte';
  import { m } from '$lib/paraglide/messages';

  const rows = [
    [
      'leaderboards.jpg',
      'c-purple',
      'fa-list-ol',
      m.support_about_leaderboards(),
      m.support_about_leaderboards_text()
    ],
    [
      'onlineusers.jpg',
      'c-green',
      'fa-globe',
      m.support_about_online(),
      m.support_about_online_text()
    ],
    [
      'osudirect.jpg',
      'c-lblue',
      'fa-download',
      m.support_about_direct(),
      m.support_about_direct_text()
    ],
    [
      'global_leaderboards.jpg',
      'c-yellow',
      'fa-trophy',
      m.support_about_global(),
      `${m.support_about_global_text()} <a href="/leaderboard">${m.support_about_global_link()}</a>.`
    ],
    [
      'request_beatmaps.jpg',
      'c-pink',
      'fa-circle-question',
      m.support_about_requests(),
      `${m.support_about_requests_text()} <a href="/rank-request">${m.support_about_requests_link()}</a>.`
    ],
    [
      'spectator.jpg',
      'c-teal',
      'fa-eye',
      m.support_about_spectator(),
      m.support_about_spectator_text()
    ],
    ['multi.jpg', 'c-blue', 'fa-users', m.support_about_multi(), m.support_about_multi_text()],
    [
      'relestobot.jpg',
      'c-orange',
      'fa-robot',
      'RealistikBot',
      m.support_about_bot_text({
        withCmd: '<code>!with</code>',
        rollCmd: '<code>!roll</code>',
        helpCmd: '<code>!help</code>'
      })
    ]
  ];
</script>

<svelte:head><title>{m.support_about_title()} · RealistikOsu</title></svelte:head>

<Banner url="/img/about/intro.jpg" class="about-banner">
  <div>
    <h1>{m.support_about_heading()}</h1>
    <p class="sub">{m.support_about_sub()}</p>
  </div>
</Banner>

<main class="wrap about">
  {#each rows as [image, colour, icon, name, text] (name)}
    <section class="feature-row {colour}">
      <img src="/img/about/{image}" alt="" loading="lazy" />
      <div>
        <h2><i class="fa-solid {icon}"></i>{name}</h2>
        <p>{@html text}</p>
      </div>
    </section>
  {/each}

  <div class="panel about-more c-blue">
    <h2>{m.support_about_more_title()}</h2>
    <p>{m.support_about_more_text()}</p>
    <p class="muted">{m.support_about_open_source()}</p>
    <div class="avatar-actions">
      <a class="btn btn-blue" href="/register"
        ><i class="fa-solid fa-user-plus"></i>{m.support_about_register()}</a
      >
      <a class="btn" href="https://github.com/RealistikOsu"
        ><i class="fa-brands fa-github"></i>{m.support_about_source()}</a
      >
      <a class="btn" href="/team"><i class="fa-solid fa-users"></i>{m.support_about_team()}</a>
    </div>
  </div>
</main>
