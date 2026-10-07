<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { dailyChallenge, dailyScores, type DailySource } from '$lib/api/rooms';
  import Banner from '$lib/components/Banner.svelte';
  import DailyCalendar from '$lib/components/DailyCalendar.svelte';
  import MatchMap from '$lib/components/MatchMap.svelte';
  import RoomBoard from '$lib/components/RoomBoard.svelte';
  import RoomMods from '$lib/components/RoomMods.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { number, utcDay } from '$lib/format';
  import { tabInk } from '@soumetsu/ui';
  import { m } from '$lib/paraglide/messages';

  const today = new Date().toISOString().slice(0, 10);
  const asked = $derived(page.url.searchParams.get('date') ?? '');
  const date = $derived(/^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today);
  const current = $derived(Math.max(1, parseInt(page.url.searchParams.get('p') ?? '') || 1));
  const source = $derived<DailySource>(
    page.url.searchParams.get('source') === 'stable' ? 'stable' : 'lazer'
  );
  const target = (src: DailySource, p: number) =>
    `?date=${date}${src === 'stable' ? '&source=stable' : ''}${p > 1 ? `&p=${p}` : ''}`;

  const challenge = query((signal) => dailyChallenge(date, signal));
  const result = $derived(challenge.state);
  const missing = $derived(
    result.status === 'error' && isApiError(result.error) && result.error.status === 404
  );
</script>

<svelte:head><title>{m.rooms_daily_title()} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg">
  <div>
    <h1>{m.rooms_daily_title()}</h1>
    <p class="sub">{utcDay(date)}</p>
  </div>
</Banner>

<main class="wrap rp-page">
  <div class="daily-top">
    <DailyCalendar selected={date} {today} />

    <div class="daily-day">
      {#if result.status === 'ready'}
        {@const day = result.data}
        <SectionTitle colour="c-blue" icon="fa-music">{m.rooms_daily_map()}</SectionTitle>
        {@const stable = source === 'stable'}
        {@const top10 = stable ? day.stable_top_10_score : day.top_10_score}
        {@const top50 = stable ? day.stable_top_50_score : day.top_50_score}
        <div class="room-facts">
          <div>
            <small>{m.rooms_stat_participants()}</small>
            <b>{number(stable ? day.stable_participants : day.participants)}</b>
          </div>
          <div>
            <small>{m.rooms_stat_top_10()}</small>
            <b>{top10 === null ? '-' : number(top10)}</b>
          </div>
          <div>
            <small>{m.rooms_stat_top_50()}</small>
            <b>{top50 === null ? '-' : number(top50)}</b>
          </div>
        </div>
        <div class="panel score-list c-blue">
          <MatchMap beatmap={day.beatmap} ruleset={day.ruleset}>
            <RoomMods required={day.required_mods} />
          </MatchMap>
        </div>
      {:else if missing}
        <div class="panel c-blue"><p class="empty-note">{m.rooms_daily_empty()}</p></div>
      {:else if result.status === 'error'}
        <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
      {:else}
        <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
      {/if}
    </div>
  </div>

  {#if result.status === 'ready'}
    <SectionTitle colour="c-purple" icon="fa-ranking-star">{m.rooms_leaderboard()}</SectionTitle>
    <nav class="tabs tinted room-tabs" use:tabInk>
      <a
        class="c-purple"
        class:active={source === 'lazer'}
        href={target('lazer', 1)}
        data-sveltekit-noscroll
      >
        {m.rooms_source_lazer()}
      </a>
      <a
        class="c-purple"
        class:active={source === 'stable'}
        href={target('stable', 1)}
        data-sveltekit-noscroll
      >
        {m.rooms_source_stable()}
      </a>
    </nav>
    {#if source === 'stable'}
      <p class="muted">{m.rooms_stable_note()}</p>
    {/if}
    {#key source}
      <RoomBoard
        load={(p, signal) => dailyScores(date, source, p, signal)}
        page={current}
        onpage={(p) => goto(target(source, p), { keepFocus: true, noScroll: true })}
        empty={source === 'stable' ? m.rooms_stable_empty() : undefined}
      />
    {/key}
  {/if}
</main>
