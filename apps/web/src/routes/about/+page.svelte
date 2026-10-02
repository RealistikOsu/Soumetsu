<script lang="ts">
  import Banner from '$lib/components/Banner.svelte';

  const rows = [
    [
      'leaderboards.jpg',
      'c-purple',
      'fa-list-ol',
      'Leaderboards',
      'Every map has its own leaderboard in-game for vanilla, relax and autopilot, with clan tags next to names.'
    ],
    [
      'onlineusers.jpg',
      'c-green',
      'fa-globe',
      'Online users',
      "See who's online from the in-game user panel, along with their rank, pp and what they're up to."
    ],
    [
      'osudirect.jpg',
      'c-lblue',
      'fa-download',
      'Free beatmap downloads',
      'osu!direct works for everyone, no supporter tag needed. Search for maps and download them without leaving the game.'
    ],
    [
      'global_leaderboards.jpg',
      'c-yellow',
      'fa-trophy',
      'Global leaderboards',
      'Rankings for every mode, by pp or by score, and for every country. <a href="/leaderboard">See the leaderboard</a>.'
    ],
    [
      'request_beatmaps.jpg',
      'c-pink',
      'fa-circle-question',
      'Beatmap rank requests',
      'Found an unranked map you like? Send it in, and the Beatmap Appreciation Team will check the whole set. <a href="/rank-request">Request a beatmap</a>.'
    ],
    [
      'spectator.jpg',
      'c-teal',
      'fa-eye',
      'Spectator',
      'Watch other players live, right from the game.'
    ],
    [
      'multi.jpg',
      'c-blue',
      'fa-users',
      'Multiplayer',
      'Make or join a lobby and play against others, just like on the official server.'
    ],
    [
      'relestobot.jpg',
      'c-orange',
      'fa-robot',
      'RealistikBot',
      'Our in-game bot. Ask it for pp with <code>!with</code>, roll with <code>!roll</code>, and see everything else it can do with <code>!help</code>.'
    ]
  ];
</script>

<svelte:head><title>About · RealistikOsu</title></svelte:head>

<Banner url="/img/about/intro.jpg" class="about-banner">
  <div>
    <h1>Welcome to RealistikOsu!</h1>
    <p class="sub">
      A custom server for the rhythm game osu!, building on the online experience with lots of fun
      features.
    </p>
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
    <h2>And a lot more!</h2>
    <p>
      RealistikOsu was first released to the public in early 2020, and has grown an unbelievable
      amount since. We have a long journey ahead of us, so come along and watch it unfold.
    </p>
    <p class="muted">
      We're also open source, so you can see the exact code we run and even contribute to it.
    </p>
    <div class="avatar-actions">
      <a class="btn btn-blue" href="/register"><i class="fa-solid fa-user-plus"></i>Register</a>
      <a class="btn" href="https://github.com/RealistikOsu"
        ><i class="fa-brands fa-github"></i>Source code</a
      >
      <a class="btn" href="/team"><i class="fa-solid fa-users"></i>Meet the team</a>
    </div>
  </div>
</main>
