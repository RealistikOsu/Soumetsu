<script lang="ts">
  import { CountUp, tabInk } from '@soumetsu/ui';
  import { query } from '$lib/api/query.svelte';
  import { homepage, topScoreIndex } from '$lib/api/v1';
  import { stats } from '$lib/api/stats';
  import { session } from '$lib/auth/session.svelte';
  import { coverUrl } from '$lib/assets';
  import AlertStack from '$lib/components/AlertStack.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Features from '$lib/components/Features.svelte';
  import OnlineGraph from '$lib/components/OnlineGraph.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import TopMap from '$lib/components/TopMap.svelte';
  import Username from '$lib/components/Username.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';
  import { site } from '$lib/site.svelte';

  const modes = [
    {
      key: 'std',
      name: 'osu!',
      mode: 0,
      cards: [
        { custom: 0, label: m.home_top_score(), colour: 'c-yellow' },
        { custom: 1, label: m.home_top_relax_score(), colour: 'c-pink' },
        { custom: 2, label: m.home_top_autopilot_score(), colour: 'c-purple' }
      ]
    },
    {
      key: 'taiko',
      name: 'Taiko',
      mode: 1,
      cards: [
        { custom: 0, label: m.home_top_score(), colour: 'c-yellow' },
        { custom: 1, label: m.home_top_relax_score(), colour: 'c-pink' }
      ]
    },
    {
      key: 'catch',
      name: 'Catch',
      mode: 2,
      cards: [
        { custom: 0, label: m.home_top_score(), colour: 'c-yellow' },
        { custom: 1, label: m.home_top_relax_score(), colour: 'c-pink' }
      ]
    },
    {
      key: 'mania',
      name: 'Mania',
      mode: 3,
      cards: [{ custom: 0, label: m.home_top_score(), colour: 'c-yellow' }]
    }
  ];

  const counts = query((signal) => stats(signal));
  // The statistics service keeps the online graph and the best play per mode.
  const home = query((signal) => homepage(signal));

  let active = $state('std');
</script>

<svelte:head>
  <title>RealistikOsu</title>
  <meta name="description" content={m.home_meta_description()} />
</svelte:head>

<AlertStack />

<main class="wrap">
  <section class="hero" style="background-image: url(/img/headers/home.jpg)">
    <div class="hero-inner">
      <div class="hero-text">
        <h1>RealistikOsu</h1>
        <p>{m.home_hero_text()}</p>
        <div class="hero-actions">
          {#if session.user}
            <a class="btn btn-blue" href="/users/{session.user.id}">{m.home_hero_your_profile()}</a>
          {:else}
            <a class="btn btn-blue" href="/register">{m.home_hero_register()}</a>
          {/if}
          <a class="btn" href="/connect">{m.home_how_to_connect()}</a>
        </div>
      </div>
      <img class="mascot" src="/img/mascot.webp" alt="" />
    </div>
    {#if home.state.status === 'ready' && home.state.data.online_history.length > 1}
      <OnlineGraph values={home.state.data.online_history} spanMinutes={2100} />
    {/if}
  </section>

  <div class="counters">
    <div class="c-blue">
      <i class="fa-solid fa-user"></i>
      <b>
        {#if counts.state.status === 'ready'}
          <CountUp value={counts.state.data.online_users} /> /
          <CountUp value={counts.state.data.registered_users} />
        {:else}
          <span class="skel" style="width: 90px"></span>
        {/if}
      </b>
      {m.home_counter_online_registered()}
    </div>
    <div class="c-orange">
      <i class="fa-solid fa-user-plus"></i>
      <b>
        {#if site.info?.latestPlayer}
          <a href="/users/{site.info.latestPlayer.id}">
            <Username id={site.info.latestPlayer.id} name={site.info.latestPlayer.username} />
          </a>
        {:else}
          <span class="skel" style="width: 70px"></span>
        {/if}
      </b>
      {m.home_counter_latest_player()}
    </div>
    <div class="c-lblue">
      <i class="fa-solid fa-angles-up"></i>
      <b>
        {#if site.info}
          <CountUp value={site.info.mapsRanked} />
        {:else}
          <span class="skel" style="width: 70px"></span>
        {/if}
      </b>
      {m.home_counter_maps_ranked()}
    </div>
  </div>

  <div class="home">
    <div>
      <div class="section-title chart-head c-yellow">
        <h2><i class="fa-solid fa-thumbs-up"></i>{m.home_top_title()}</h2>
        <nav class="tabs top-modes" use:tabInk>
          {#each modes as mode (mode.key)}
            <a
              class:active={active === mode.key}
              href="#top-{mode.key}"
              onclick={(event) => {
                event.preventDefault();
                active = mode.key;
              }}
            >
              <img src="/img/modes/mode-{mode.mode}.png" alt="" />{mode.name}
            </a>
          {/each}
        </nav>
      </div>
      {#each modes as mode (mode.key)}
        <div class="top-scores" id="top-{mode.key}" hidden={active !== mode.key}>
          {#if home.state.status === 'ready'}
            {#each mode.cards as card (card.custom)}
              {@const score = home.state.data.top_scores[topScoreIndex(mode.mode, card.custom)]}
              {#if score}
                <div
                  class="top-score {card.colour}"
                  style="background-image: url({coverUrl(score.beatmapset_id, 'card')})"
                >
                  <span class="label">{card.label}</span>
                  <b>{number(score.pp_val)}pp</b>
                  <a class="by" href="/users/{score.user_id}">
                    {m.home_top_done_by()}
                    <Avatar id={score.user_id} />
                    <Username id={score.user_id} name={score.username} />
                  </a>
                  <TopMap id={score.beatmap_id} />
                </div>
              {/if}
            {/each}
          {:else if home.state.status === 'loading'}
            {#each mode.cards as card (card.custom)}
              <div class="top-score {card.colour}" aria-hidden="true">
                <span class="skel" style="width: 40%"></span>
                <span class="skel" style="width: 60%; height: 28px"></span>
                <span class="skel" style="width: 50%"></span>
              </div>
            {/each}
          {:else}
            <p class="panel empty-note">{m.home_top_load_error()}</p>
          {/if}
        </div>
      {/each}

      <SectionTitle colour="c-green" icon="fa-bolt">{m.home_features_title()}</SectionTitle>
      <Features />
    </div>

    <aside>
      <SectionTitle colour="c-green" icon="fa-download">{m.home_links_title()}</SectionTitle>
      <ul class="panel links c-green">
        <li><a href="/patcher">{m.home_links_patcher()} <small>Windows, Linux</small></a></li>
        <li><a href="/connect">{m.home_how_to_connect()}</a></li>
        <li><a href="/doc/rules">{m.home_links_rules()}</a></li>
        <li><a href="/doc">{m.home_links_docs()}</a></li>
      </ul>

      <h2 class="section-title c-discord"><i class="fa-brands fa-discord"></i>Discord</h2>
      <a class="discord" href="/discord">
        {m.home_discord_join()}<small>{m.home_discord_sub()}</small>
      </a>
    </aside>
  </div>
</main>
