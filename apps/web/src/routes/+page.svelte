<script lang="ts">
  import { CountUp, tabInk } from '@soumetsu/ui';
  import { query } from '$lib/api/query.svelte';
  import { onlineHistory } from '$lib/api/v1';
  import { stats } from '$lib/api/stats';
  import { topScoresMixed, type TopScore } from '$lib/api/scores';
  import { session } from '$lib/auth/session.svelte';
  import { coverUrl } from '$lib/assets';
  import AlertStack from '$lib/components/AlertStack.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Features from '$lib/components/Features.svelte';
  import OnlineGraph from '$lib/components/OnlineGraph.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Username from '$lib/components/Username.svelte';
  import { number } from '$lib/format';
  import { site } from '$lib/site.svelte';

  const modes = [
    {
      key: 'std',
      name: 'osu!',
      mode: 0,
      cards: [
        { custom: 0, label: 'Top score', colour: 'c-yellow' },
        { custom: 1, label: 'Top relax score', colour: 'c-pink' },
        { custom: 2, label: 'Top autopilot score', colour: 'c-purple' }
      ]
    },
    {
      key: 'taiko',
      name: 'Taiko',
      mode: 1,
      cards: [
        { custom: 0, label: 'Top score', colour: 'c-yellow' },
        { custom: 1, label: 'Top relax score', colour: 'c-pink' }
      ]
    },
    {
      key: 'catch',
      name: 'Catch',
      mode: 2,
      cards: [
        { custom: 0, label: 'Top score', colour: 'c-yellow' },
        { custom: 1, label: 'Top relax score', colour: 'c-pink' }
      ]
    },
    {
      key: 'mania',
      name: 'Mania',
      mode: 3,
      cards: [{ custom: 0, label: 'Top score', colour: 'c-yellow' }]
    }
  ];

  const counts = query((signal) => stats(signal));
  const tops = query((signal) => topScoresMixed(signal));
  const history = query((signal) => onlineHistory(signal));

  let active = $state('std');

  const find = (scores: TopScore[], mode: number, custom: number) =>
    scores.find((s) => s.play_mode === mode && s.custom_mode === custom);
</script>

<svelte:head>
  <title>RealistikOsu</title>
  <meta
    name="description"
    content="RealistikOsu is a private server for the rhythm game osu! It features ranked Relax and Autopilot among countless other unique features!"
  />
</svelte:head>

<AlertStack />

<main class="wrap">
  <section class="hero" style="background-image: url(/img/headers/home.jpg)">
    <div class="hero-inner">
      <div class="hero-text">
        <h1>RealistikOsu</h1>
        <p>
          A custom server for the rhythm game osu!, with its own map ranking, clans, and dedicated
          leaderboards and pp systems for Relax and Autopilot.
        </p>
        <div class="hero-actions">
          {#if session.user}
            <a class="btn btn-blue" href="/users/{session.user.id}">Your profile</a>
          {:else}
            <a class="btn btn-blue" href="/register">Register now</a>
          {/if}
          <a class="btn" href="/connect">How to connect</a>
        </div>
      </div>
      <img class="mascot" src="/img/mascot.webp" alt="" />
    </div>
    {#if history.state.status === 'ready' && history.state.data.length > 1}
      <OnlineGraph values={history.state.data} spanMinutes={2100} />
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
      Online / Registered
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
      Latest player
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
      Maps ranked
    </div>
  </div>

  <div class="home">
    <div>
      <div class="section-title chart-head c-yellow">
        <h2><i class="fa-solid fa-thumbs-up"></i>Top scores</h2>
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
          {#if tops.state.status === 'ready'}
            {#each mode.cards as card (card.custom)}
              {@const score = find(tops.state.data, mode.mode, card.custom)}
              {#if score}
                <div
                  class="top-score {card.colour}"
                  style="background-image: url({coverUrl(score.beatmap.beatmapset_id, 'card')})"
                >
                  <span class="label">{card.label}</span>
                  <b>{number(Math.round(score.pp))}pp</b>
                  <a class="by" href="/users/{score.player_id}">
                    Done by <Avatar id={score.player_id} />
                    <Username id={score.player_id} name={score.username} />
                  </a>
                  <a class="map" href="/beatmaps/{score.beatmap.beatmap_id}">
                    {score.beatmap.song_name}
                  </a>
                </div>
              {/if}
            {/each}
          {:else if tops.state.status === 'loading'}
            {#each mode.cards as card (card.custom)}
              <div class="top-score {card.colour}" aria-hidden="true">
                <span class="skel" style="width: 40%"></span>
                <span class="skel" style="width: 60%; height: 28px"></span>
                <span class="skel" style="width: 50%"></span>
              </div>
            {/each}
          {:else}
            <p class="panel empty-note">Couldn't load the top scores. Try again in a bit.</p>
          {/if}
        </div>
      {/each}

      <SectionTitle colour="c-green" icon="fa-bolt">What we have</SectionTitle>
      <Features />
    </div>

    <aside>
      <SectionTitle colour="c-green" icon="fa-download">Getting started</SectionTitle>
      <ul class="panel links c-green">
        <li><a href="/patcher">Download the patcher <small>Windows, Linux</small></a></li>
        <li><a href="/connect">How to connect</a></li>
        <li><a href="/doc/rules">Rules</a></li>
        <li><a href="/doc">Documentation</a></li>
      </ul>

      <h2 class="section-title c-discord"><i class="fa-brands fa-discord"></i>Discord</h2>
      <a class="discord" href="/discord">
        Join our Discord<small>Hangout with people who get it</small>
      </a>
    </aside>
  </div>
</main>
