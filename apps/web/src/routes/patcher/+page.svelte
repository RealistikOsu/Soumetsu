<script lang="ts">
  import { query } from '$lib/api/query.svelte';
  import { patcherVersion } from '$lib/api/v1';
  import Banner from '$lib/components/Banner.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';

  const features = [
    ['relax-misses', 'Enable relax misses', 'c-pink', 'fa-xmark'],
    ['rate-changes', 'Rate changes', 'c-lblue', 'fa-forward'],
    ['pp-counter', 'PP counter', 'c-yellow', 'fa-gauge'],
    ['settings', 'Customisable feature set', 'c-green', 'fa-sliders']
  ];

  const patcherSettings = [
    'Relax misses',
    'Confirm pause on relax',
    'Leaderboard PP',
    'Leaderboard PP on vanilla',
    'Half time like daycore',
    'Show unstable rate',
    'Disable nightcore beat',
    'Enable coins',
    'Show coins during play',
    'Disable coin sounds'
  ];

  const counterSettings = [
    'Show PP counter',
    'In-game PP counter scale',
    'PP counter position in-game',
    'PP counter decimals',
    'Always show decimals'
  ];

  const version = query((signal) => patcherVersion(signal));
</script>

<svelte:head><title>Patcher · RealistikOsu</title></svelte:head>

<Banner image="patcher.jpg">
  <div>
    <h1>Patcher</h1>
    {#if version.state.status === 'ready' && version.state.data}
      <p class="sub">Build {version.state.data}</p>
    {/if}
  </div>
</Banner>

<main class="wrap patcher">
  <div class="patcher-top">
    <div>
      <p class="lead">
        The RealistikOsu patcher makes relax play better. It brings back things like ranking panels,
        and adds rate changes and a pp counter on top.
      </p>
      <ol class="steps">
        <li><b>Run the installer</b><span>It installs the patcher on your PC.</span></li>
        <li>
          <b>Open the patcher</b><span>Start it whenever you want to play on RealistikOsu.</span>
        </li>
      </ol>
    </div>
    <div class="panel download-box c-green">
      <a class="action download" href="/api/v1/patcher/launcher/windows/download">
        <i class="fa-brands fa-windows"></i>Download for Windows
      </a>
      <p>
        Not your platform?
        <a href="/api/v1/patcher/launcher/linux/download"
          ><i class="fa-brands fa-linux"></i> Linux</a
        >
      </p>
    </div>
  </div>

  <SectionTitle colour="c-blue" icon="fa-star">Features</SectionTitle>
  <div class="features-grid">
    {#each features as [key, name, colour, icon] (key)}
      <figure class="panel feature {colour}">
        <img src="/img/patcher/{key}.jpg" alt="{name} in game" loading="lazy" />
        <figcaption><i class="fa-solid {icon}"></i>{name}</figcaption>
      </figure>
    {/each}
  </div>

  <SectionTitle colour="c-green" icon="fa-sliders">Everything you can toggle</SectionTitle>
  <div class="panel toggles c-green">
    <div>
      <h3>Patcher settings</h3>
      <ul>
        {#each patcherSettings as name (name)}<li>{name}</li>{/each}
      </ul>
    </div>
    <div>
      <h3>PP counter settings</h3>
      <ul>
        {#each counterSettings as name (name)}<li>{name}</li>{/each}
      </ul>
    </div>
  </div>
</main>
