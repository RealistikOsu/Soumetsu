<script lang="ts">
  import { query } from '$lib/api/query.svelte';
  import { patcherVersion } from '$lib/api/v1';
  import Banner from '$lib/components/Banner.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { m } from '$lib/paraglide/messages';

  const features = [
    ['relax-misses', m.support_patcher_feature_misses(), 'c-pink', 'fa-xmark'],
    ['rate-changes', m.support_patcher_feature_rate(), 'c-lblue', 'fa-forward'],
    ['pp-counter', m.support_patcher_feature_counter(), 'c-yellow', 'fa-gauge'],
    ['settings', m.support_patcher_feature_settings(), 'c-green', 'fa-sliders']
  ];

  const patcherSettings = [
    m.support_patcher_opt_relax_misses(),
    m.support_patcher_opt_confirm_pause(),
    m.support_patcher_opt_leaderboard_pp(),
    m.support_patcher_opt_leaderboard_pp_vanilla(),
    m.support_patcher_opt_half_time(),
    m.support_patcher_opt_unstable_rate(),
    m.support_patcher_opt_nightcore_beat(),
    m.support_patcher_opt_coins(),
    m.support_patcher_opt_coins_play(),
    m.support_patcher_opt_coin_sounds()
  ];

  const counterSettings = [
    m.support_patcher_opt_show_counter(),
    m.support_patcher_opt_counter_scale(),
    m.support_patcher_opt_counter_position(),
    m.support_patcher_opt_counter_decimals(),
    m.support_patcher_opt_always_decimals()
  ];

  const version = query((signal) => patcherVersion(signal));
</script>

<svelte:head><title>{m.support_patcher_title()} · RealistikOsu</title></svelte:head>

<Banner image="patcher.jpg">
  <div>
    <h1>{m.support_patcher_title()}</h1>
    {#if version.state.status === 'ready' && version.state.data}
      <p class="sub">{m.support_patcher_build({ version: version.state.data })}</p>
    {/if}
  </div>
</Banner>

<main class="wrap patcher">
  <div class="patcher-top">
    <div>
      <p class="lead">{m.support_patcher_lead()}</p>
      <ol class="steps">
        <li>
          <b>{m.support_patcher_step_install()}</b><span
            >{m.support_patcher_step_install_text()}</span
          >
        </li>
        <li>
          <b>{m.support_patcher_step_open()}</b><span>{m.support_patcher_step_open_text()}</span>
        </li>
      </ol>
    </div>
    <div class="panel download-box c-green">
      <a class="action download" href="/api/v1/patcher/launcher/windows/download">
        <i class="fa-brands fa-windows"></i>{m.support_patcher_download_windows()}
      </a>
      <p>
        {m.support_patcher_other_platform()}
        <a href="/api/v1/patcher/launcher/linux/download"
          ><i class="fa-brands fa-linux"></i> Linux</a
        >
      </p>
    </div>
  </div>

  <SectionTitle colour="c-blue" icon="fa-star">{m.support_patcher_features()}</SectionTitle>
  <div class="features-grid">
    {#each features as [key, name, colour, icon] (key)}
      <figure class="panel feature {colour}">
        <img
          src="/img/patcher/{key}.jpg"
          alt={m.support_patcher_feature_alt({ name })}
          loading="lazy"
        />
        <figcaption><i class="fa-solid {icon}"></i>{name}</figcaption>
      </figure>
    {/each}
  </div>

  <SectionTitle colour="c-green" icon="fa-sliders">{m.support_patcher_toggles()}</SectionTitle>
  <div class="panel toggles c-green">
    <div>
      <h3>{m.support_patcher_settings()}</h3>
      <ul>
        {#each patcherSettings as name (name)}<li>{name}</li>{/each}
      </ul>
    </div>
    <div>
      <h3>{m.support_patcher_counter_settings()}</h3>
      <ul>
        {#each counterSettings as name (name)}<li>{name}</li>{/each}
      </ul>
    </div>
  </div>
</main>
