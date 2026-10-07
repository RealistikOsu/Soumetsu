<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { dailyChallenge, dailyScores } from '$lib/api/rooms';
  import Banner from '$lib/components/Banner.svelte';
  import DailyCalendar from '$lib/components/DailyCalendar.svelte';
  import RankedMap from '$lib/components/RankedMap.svelte';
  import RoomBoard from '$lib/components/RoomBoard.svelte';
  import RoomMods from '$lib/components/RoomMods.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { number, utcDay } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const today = new Date().toISOString().slice(0, 10);
  const asked = $derived(page.url.searchParams.get('date') ?? '');
  const date = $derived(/^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today);
  const current = $derived(Math.max(1, parseInt(page.url.searchParams.get('p') ?? '') || 1));

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
  <DailyCalendar selected={date} {today} />

  {#if result.status === 'ready'}
    {@const day = result.data}
    <SectionTitle colour="c-blue" icon="fa-music">{m.rooms_daily_map()}</SectionTitle>
    <div class="room-facts">
      <div>
        <small>{m.rooms_stat_participants()}</small>
        <b>{number(day.participants)}</b>
      </div>
      <div>
        <small>{m.rooms_stat_top_10()}</small>
        <b>{day.top_10_score === null ? '-' : number(day.top_10_score)}</b>
      </div>
      <div>
        <small>{m.rooms_stat_top_50()}</small>
        <b>{day.top_50_score === null ? '-' : number(day.top_50_score)}</b>
      </div>
    </div>
    <div class="panel score-list c-blue">
      <RankedMap beatmap={day.beatmap} ruleset={day.ruleset}>
        <RoomMods required={day.required_mods} />
      </RankedMap>
    </div>

    <SectionTitle colour="c-purple" icon="fa-ranking-star">{m.rooms_leaderboard()}</SectionTitle>
    <RoomBoard
      load={(p, signal) => dailyScores(date, p, signal)}
      page={current}
      onpage={(p) => goto(`?date=${date}&p=${p}`, { keepFocus: true, noScroll: true })}
    />
  {:else if missing}
    <div class="panel c-blue"><p class="empty-note">{m.rooms_daily_empty()}</p></div>
  {:else if result.status === 'error'}
    <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
  {/if}
</main>
