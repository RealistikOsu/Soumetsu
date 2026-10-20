<script lang="ts">
  import { untrack } from 'svelte';
  import { tabInk } from '@soumetsu/ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { commissionStreaks } from '$lib/api/commissions';
  import { dailyStats } from '$lib/api/dailyChallenge';
  import { query } from '$lib/api/query.svelte';
  import { playerScores, type ScoreWithBeatmap } from '$lib/api/scores';
  import { profile, userpage, type UserProfile } from '$lib/api/users';
  import { peakRank, profileHistory, type ProfileHistory } from '$lib/api/v1';
  import { Privilege } from '$lib/auth/privileges';
  import { countryName } from '$lib/countries';
  import { fullDate, number } from '$lib/format';
  import {
    allowed,
    favouriteView,
    isLazer,
    modeNames,
    parseRx,
    relaxColours,
    relaxNames,
    slideTowards
  } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';
  import { getProfile } from '$lib/profile';
  import AlertStack from './AlertStack.svelte';
  import CommissionStats from './CommissionStats.svelte';
  import Comments from './Comments.svelte';
  import DailyStats from './DailyStats.svelte';
  import Medals from './Medals.svelte';
  import PinDialog from './PinDialog.svelte';
  import ProfileMaps from './ProfileMaps.svelte';
  import ProfilePane from './ProfilePane.svelte';
  import ProfileStats from './ProfileStats.svelte';
  import SectionTitle from './SectionTitle.svelte';
  import Userpage from './Userpage.svelte';

  const owner = getProfile();
  const id = $derived(owner.id);
  const extra = $derived(owner.extra);
  const own = $derived(owner.own);

  const dailyQuery = query((signal) => dailyStats(id, signal));
  const daily = $derived(
    dailyQuery.state.status === 'ready' && dailyQuery.state.data.total_days > 0
      ? dailyQuery.state.data
      : null
  );
  const commissionQuery = query((signal) => commissionStreaks(id, signal));
  const commissions = $derived(
    commissionQuery.state.status === 'ready' && commissionQuery.state.data.totalDays > 0
      ? commissionQuery.state.data
      : null
  );
  const page_ = query((signal) => userpage(id, signal));

  type Tab = 'overview' | 'beatmaps' | 'achievements' | 'activity' | 'comments';

  const view = $derived.by(() => {
    const q = page.url.searchParams;
    const tab = (q.get('tab') ?? 'overview') as Tab;
    // A link that names a mode or type opens exactly that; otherwise the player's favourites.
    if (!q.has('rx') && !q.has('mode'))
      return { ...favouriteView(extra?.favouriteMode ?? 0, extra?.preferRelax ?? 0), tab };
    const rx = parseRx(q.get('rx'));
    const asked = q.has('mode') ? Number(q.get('mode')) : (extra?.favouriteMode ?? 0);
    return { rx, mode: allowed(asked, rx) ? asked : 0, tab };
  });
  const key = $derived(`${view.mode}-${view.rx}`);
  const lazer = $derived(isLazer(view.rx));

  let commentTotal = $derived(extra?.commentCount ?? 0);

  // Tabs with nothing in them aren't shown.
  const tabs = $derived(
    [
      { key: 'overview', icon: 'fa-house', label: m.profile_tab_overview(), shown: true },
      {
        key: 'beatmaps',
        icon: 'fa-music',
        label: m.profile_tab_beatmaps(),
        shown: !lazer || (extra?.rankedSets ?? 0) > 0 || (extra?.mappedSets ?? 0) > 0
      },
      {
        key: 'achievements',
        icon: 'fa-medal',
        label: m.profile_achievements_title(),
        shown: true
      },
      {
        key: 'activity',
        icon: 'fa-calendar-days',
        label: m.profile_tab_activity(),
        shown: !!daily || !!commissions
      },
      {
        key: 'comments',
        icon: 'fa-comments',
        label: m.profile_comments_title(),
        shown: true,
        count: commentTotal
      }
    ].filter((tab) => tab.shown) as { key: Tab; icon: string; label: string; count?: number }[]
  );
  const tab = $derived(tabs.some((t) => t.key === view.tab) ? view.tab : 'overview');

  function go(next: Partial<typeof view>) {
    const merged = { ...view, ...next };
    if (!allowed(merged.mode, merged.rx)) merged.mode = 0;
    if (next.tab) {
      const from = tabs.findIndex((t) => t.key === tab);
      const to = tabs.findIndex((t) => t.key === next.tab);
      document.documentElement.style.setProperty('--slide', String(Math.sign(to - from)));
    } else {
      slideTowards(view, merged);
    }
    const tabPart = merged.tab === 'overview' ? '' : `&tab=${merged.tab}`;
    goto(`?mode=${merged.mode}&rx=${merged.rx}${tabPart}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }

  // Each ruleset is played on stable or on lazer, which keeps its own stats as the rx values 3 to 5.
  const ruleset = $derived(view.rx % 3);
  const rxFor = (set: number, onLazer: boolean) => set + (onLazer ? 3 : 0);

  let loaded = $state.raw<Record<string, UserProfile>>({});
  let visited = $state.raw<string[]>([]);
  let opened = $state.raw<Tab[]>([]);
  let peak = $state.raw<Record<string, { rank: number; time: number } | null>>({});
  let rankHistory = $state.raw<Record<string, ProfileHistory>>({});
  let pinned = $state.raw<Record<string, ScoreWithBeatmap[]>>({});
  let refresh = $state(0);

  $effect(() => {
    const current = key;
    const { mode, rx } = view;
    untrack(() => {
      if (!visited.includes(current)) visited = [...visited, current];
      if (loaded[current]) return;
      profile(id, mode, rx).then(
        (result) => (loaded = { ...loaded, [current]: result }),
        () => null
      );
      peakRank(id, mode, rx).then(
        (found) => (peak = { ...peak, [current]: found }),
        () => null
      );
      profileHistory('rank', id, mode, rx).then(
        (found) => (rankHistory = { ...rankHistory, [current]: found }),
        () => (rankHistory = { ...rankHistory, [current]: { status: 'missing' } })
      );
    });
  });

  $effect(() => {
    const current = tab;
    untrack(() => {
      if (!opened.includes(current)) opened = [...opened, current];
    });
  });

  $effect(() => {
    const current = key;
    const { mode, rx } = view;
    // Re-runs after a pin or unpin, which bumps this counter.
    if (refresh < 0 || isLazer(rx)) return;
    playerScores('pinned', id, mode, rx, 1, 50).then(
      (rows) => (pinned = { ...pinned, [current]: rows }),
      () => null
    );
  });

  const base = $derived(owner.base);
  const title = $derived(
    base ? m.profile_head_title({ username: base.username }) : m.profile_head_title_fallback()
  );
  const isBot = $derived(((base?.privileges ?? 0) & 41943043) === 41943043);
  // Only staff get this far on a restricted profile; the player sees the site-wide restricted notice instead.
  const restrictedToStaff = $derived(!!base && (base.privileges & Privilege.Public) === 0 && !own);

  let pinTarget = $state<ScoreWithBeatmap | null>(null);
  let pinOpen = $state(false);

  const pinIsPinned = $derived(
    !!pinTarget && (pinned[key] ?? []).some((score) => score.id === pinTarget!.id)
  );
  const userpageText = $derived(
    page_.state.status === 'ready' ? page_.state.data.content.trim() : ''
  );
</script>

<svelte:head>
  <title>{title} · RealistikOsu</title>
  {#if base}
    <meta
      name="description"
      content={m.profile_head_description({
        username: base.username,
        country: countryName(base.country)
      })}
    />
  {/if}
</svelte:head>

<div class="profile-switch">
  <div class="wrap">
    <nav class="tabs tinted" use:tabInk>
      {#each [0, 1, 2] as set (set)}
        {@const rx = rxFor(set, lazer)}
        <a
          class="{relaxColours[set]} {set === ruleset ? 'active' : ''}"
          class:disabled={!allowed(view.mode, rx)}
          href="?mode={view.mode}&rx={rx}"
          onclick={(event) => {
            event.preventDefault();
            if (allowed(view.mode, rx)) go({ rx });
          }}>{relaxNames[set]}</a
        >
      {/each}
    </nav>
    <nav class="tabs tinted" use:tabInk>
      {#each [false, true] as onLazer (onLazer)}
        {@const rx = rxFor(ruleset, onLazer)}
        <a
          class="{onLazer ? 'c-teal' : 'c-pink'} {onLazer === lazer ? 'active' : ''}"
          href="?mode={view.mode}&rx={rx}"
          onclick={(event) => {
            event.preventDefault();
            go({ rx });
          }}>{onLazer ? 'osu!lazer' : 'osu!stable'}</a
        >
      {/each}
    </nav>
    <nav class="tabs mode-icons" use:tabInk>
      {#each modeNames as name, i (name)}
        <a
          class:active={i === view.mode}
          class:disabled={!allowed(i, view.rx)}
          href="?mode={i}&rx={view.rx}"
          title={name}
          aria-label={name}
          onclick={(event) => {
            event.preventDefault();
            if (allowed(i, view.rx)) go({ mode: i });
          }}><img src="/img/modes/mode-{i}.png" alt="" /></a
        >
      {/each}
    </nav>
  </div>
</div>

<AlertStack />

<main class="wrap profile-page">
  {#if extra?.silence}
    <div class="notice alert profile-state c-red">
      <i class="fa-solid fa-comment-slash notice-icon"></i>
      <div>
        <b>{m.profile_notice_silenced_title()}</b>
        {m.profile_notice_silenced_body({
          reason: extra.silence.reason,
          end: fullDate(extra.silence.end)
        })}
      </div>
    </div>
  {/if}
  {#if extra?.frozen}
    <div class="notice alert profile-state c-yellow">
      <i class="fa-solid fa-snowflake notice-icon"></i>
      <div>
        <b>{m.profile_notice_frozen_title()}</b>
        {m.profile_notice_frozen_body()}
      </div>
    </div>
  {/if}
  {#if restrictedToStaff}
    <div class="notice alert profile-state c-red">
      <i class="fa-solid fa-user-lock notice-icon"></i>
      <div>
        <b>{m.profile_notice_restricted_title()}</b>
        {m.profile_notice_restricted_body()}
      </div>
    </div>
  {/if}
  {#if isBot}
    <div class="notice alert profile-state c-blue">
      <i class="fa-solid fa-robot notice-icon"></i>
      <div>
        <b>{m.profile_notice_bot_title()}</b>
        {m.profile_notice_bot_body()}
      </div>
    </div>
  {/if}

  <div class="strip-zone">
    {#each visited as pane (pane)}
      <div data-pane={pane} hidden={pane !== key}>
        {#if loaded[pane]}
          {#if loaded[pane].stats.playcount === 0}
            <div class="panel empty-mode c-blue">
              <img src="/img/modes/mode-{pane.split('-')[0]}.png" alt="" />
              <p>
                {m.profile_empty_mode({
                  username: loaded[pane].username,
                  mode: modeNames[Number(pane.split('-')[0])],
                  relax: relaxNames[Number(pane.split('-')[1])].toLowerCase()
                })}
              </p>
            </div>
          {:else}
            {@const [paneMode, paneRx] = pane.split('-').map(Number)}
            <ProfileStats
              {id}
              mode={paneMode}
              rx={paneRx}
              stats={loaded[pane].stats}
              peakRank={peak[pane] ?? null}
              rankHistory={rankHistory[pane]}
            />
          {/if}
        {:else}
          <div class="panel"><span class="skel" style="width: 100%; height: 200px"></span></div>
        {/if}
      </div>
    {/each}
  </div>

  <nav class="profile-tabs" use:tabInk>
    {#each tabs as t (t.key)}
      <a
        class:active={t.key === tab}
        href="?mode={view.mode}&rx={view.rx}&tab={t.key}"
        onclick={(event) => {
          event.preventDefault();
          if (t.key !== tab) go({ tab: t.key });
        }}
      >
        <i class="fa-solid {t.icon}"></i>{t.label}
        {#if t.count}<small>{number(t.count)}</small>{/if}
      </a>
    {/each}
  </nav>

  {#each opened as shown (shown)}
    <section class="profile-tab" data-pane="tab-{shown}" hidden={shown !== tab}>
      {#if shown === 'overview'}
        {#if userpageText}
          <SectionTitle colour="c-pink" icon="fa-heart">{m.profile_userpage_title()}</SectionTitle>
          <div class="panel c-pink"><Userpage content={userpageText} /></div>
        {/if}
        <div class="profile-overview" class:solo={!daily && !commissions}>
          <div>
            {#key refresh}
              {#each visited as pane (pane)}
                {#if loaded[pane] && loaded[pane].stats.playcount > 0}
                  {@const [paneMode, paneRx] = pane.split('-').map(Number)}
                  <div class="score-zone" data-pane={pane} hidden={pane !== key}>
                    <ProfilePane
                      {id}
                      mode={paneMode}
                      rx={paneRx}
                      {own}
                      pinned={pinned[pane] ?? null}
                      onpin={(score) => {
                        pinTarget = score;
                        pinOpen = true;
                      }}
                    />
                  </div>
                {/if}
              {/each}
            {/key}
          </div>
          {#if daily}
            <aside><DailyStats {daily} onmore={() => go({ tab: 'activity' })} /></aside>
          {:else if commissions}
            <aside>
              <CommissionStats stats={commissions} onmore={() => go({ tab: 'activity' })} />
            </aside>
          {/if}
        </div>
      {:else if shown === 'beatmaps'}
        <ProfileMaps
          {id}
          mode={view.mode}
          rx={view.rx}
          rankedSets={extra?.rankedSets ?? 0}
          mappedSets={extra?.mappedSets ?? 0}
        />
      {:else if shown === 'achievements'}
        <Medals {id} />
      {:else if shown === 'activity'}
        <div class="profile-activity">
          {#if daily}<div><DailyStats {daily} /></div>{/if}
          {#if commissions}<div><CommissionStats stats={commissions} /></div>{/if}
        </div>
      {:else}
        <SectionTitle colour="c-teal" icon="fa-comments">
          {m.profile_comments_title()} <small>{number(commentTotal)}</small>
        </SectionTitle>
        <Comments
          profileId={id}
          disabled={extra?.commentsDisabled ?? false}
          bind:total={commentTotal}
        />
      {/if}
    </section>
  {/each}
</main>

<PinDialog
  score={pinTarget}
  pinned={pinIsPinned}
  rx={view.rx}
  bind:open={pinOpen}
  ondone={() => refresh++}
/>
