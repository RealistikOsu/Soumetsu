<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { playerScores, type ScoreWithBeatmap } from '$lib/api/scores';
  import { userExtras } from '$lib/api/site';
  import { profile, rankHistory, userpage, type UserProfile } from '$lib/api/users';
  import { session } from '$lib/auth/session.svelte';
  import { bannerUrl } from '$lib/assets';
  import { fullDate, monthYear, number, timeAgo } from '$lib/format';
  import { badgeIcon } from '$lib/badges';
  import { decorationClass } from '$lib/decorations';
  import { allowed, modeNames, relaxNames, slideTowards } from '$lib/modes';
  import Avatar from './Avatar.svelte';
  import Comments from './Comments.svelte';
  import FriendButton from './FriendButton.svelte';
  import AlertStack from './AlertStack.svelte';
  import Flag from './Flag.svelte';
  import Medals from './Medals.svelte';
  import ModeTabs from './ModeTabs.svelte';
  import NotFound from './NotFound.svelte';
  import PinDialog from './PinDialog.svelte';
  import ProfilePane from './ProfilePane.svelte';
  import ProfileStats from './ProfileStats.svelte';
  import RelaxTabs from './RelaxTabs.svelte';
  import ScoreDialog from './ScoreDialog.svelte';
  import SectionTitle from './SectionTitle.svelte';
  import Userpage from './Userpage.svelte';

  let { id }: { id: number } = $props();

  const playStyles = [
    'Mouse',
    'Tablet',
    'Keyboard',
    'Touchscreen',
    'Spoon',
    'Leap motion',
    'Oculus rift',
    'Dick',
    'Eggplant'
  ];
  const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

  const extras = query((signal) => userExtras(id, signal));
  const page_ = query((signal) => userpage(id, signal));
  const own = $derived(session.user?.id === id);
  const extra = $derived(extras.state.status === 'ready' ? extras.state.data : null);

  const view = $derived.by(() => {
    const q = page.url.searchParams;
    const rx = [0, 1, 2].includes(Number(q.get('rx'))) && q.has('rx') ? Number(q.get('rx')) : 0;
    const fallback = extra?.favouriteMode ?? 0;
    const asked = q.has('mode') ? Number(q.get('mode')) : fallback;
    return { rx, mode: allowed(asked, rx) ? asked : 0 };
  });
  const key = $derived(`${view.mode}-${view.rx}`);

  function go(next: Partial<typeof view>) {
    const merged = { ...view, ...next };
    if (!allowed(merged.mode, merged.rx)) merged.mode = 0;
    slideTowards(view, merged);
    goto(`?mode=${merged.mode}&rx=${merged.rx}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }

  let loaded = $state.raw<Record<string, UserProfile>>({});
  let visited = $state.raw<string[]>([]);
  let failure = $state<unknown>(null);
  let peak = $state.raw<Record<string, number | null>>({});
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
        (error) => (failure = error)
      );
      rankHistory(id, mode, rx).then(
        (rows) => {
          const ranks = rows.map((r) => r.overall).filter((r) => r > 0);
          peak = { ...peak, [current]: ranks.length ? Math.min(...ranks) : null };
        },
        () => null
      );
    });
  });

  $effect(() => {
    const current = key;
    const { mode, rx } = view;
    // Re-runs after a pin or unpin, which bumps this counter.
    if (refresh < 0) return;
    playerScores('pinned', id, mode, rx, 1, 50).then(
      (rows) => (pinned = { ...pinned, [current]: rows }),
      () => null
    );
  });

  const base = $derived(loaded[key] ?? Object.values(loaded)[0] ?? null);
  const hidden = $derived(
    extra?.visibility === 'hidden' ||
      (extras.state.status === 'error' && isApiError(extras.state.error)) ||
      (isApiError(failure) && failure.status >= 400 && failure.status < 500)
  );

  // An uploaded banner sits over the default one, which shows if the file is missing.
  const heading = $derived(
    extra?.banner?.type === 1
      ? `url(${bannerUrl(id)}), url(/img/banner-default.png)`
      : 'url(/img/banner-default.png)'
  );

  const playing = $derived(
    playStyles.filter((_, i) => (extra?.playStyle ?? 0) & (1 << i)).join(', ')
  );
  const isBot = $derived(((base?.privileges ?? 0) & 41943043) === 41943043);

  let detail = $state<ScoreWithBeatmap | null>(null);
  let detailOpen = $state(false);
  let pinTarget = $state<ScoreWithBeatmap | null>(null);
  let pinOpen = $state(false);
  let commentTotal = $derived(extra?.commentCount ?? 0);

  const pinIsPinned = $derived(
    !!pinTarget && (pinned[key] ?? []).some((score) => score.id === pinTarget!.id)
  );
</script>

<svelte:head>
  <title>{base ? `${base.username}'s profile` : 'Profile'} · RealistikOsu</title>
  {#if base}
    <meta
      name="description"
      content="{base.username} is a RealistikOsu player from {countryNames.of(base.country) ??
        base.country}."
    />
  {/if}
</svelte:head>

{#if hidden}
  <NotFound />
{:else}
  <section
    class="profile-head"
    style={extra?.banner?.type === 2
      ? `background-color: ${extra.banner.value}`
      : `background-image: ${heading}`}
  >
    <div class="wrap">
      <Avatar {id} />
      <div class="who-block">
        {#if base}
          <div class="name-row">
            <h1>
              {#if base.clan}
                <a class="clan-tag" href="/c/{base.clan.id}">[{base.clan.tag}]</a>
              {/if}
              <span class={decorationClass(extra?.nameDecoration)}>{base.username}</span>
            </h1>
            {#if extra?.pastNames.length}
              <details class="past-names">
                <summary title="Previous usernames" aria-label="Previous usernames">
                  <i class="fa-solid fa-clock-rotate-left"></i>{extra.pastNames.length}
                </summary>
                <div>
                  <span>Previously known as</span>
                  <ol>
                    {#each extra.pastNames as name (name)}<li>{name}</li>{/each}
                  </ol>
                </div>
              </details>
            {/if}
          </div>
          {#if extra && (extra.badges.length || extra.customBadge)}
            <div class="badges">
              {#each extra.badges as badge (badge.name)}
                {@const look = badgeIcon(badge.icon)}
                <span class="badge {look.colour}"><i class={look.icon}></i>{badge.name}</span>
              {/each}
              {#if extra.customBadge}
                {@const look = badgeIcon(extra.customBadge.icon)}
                <span class="badge custom {look.colour}" title="Custom badge">
                  <i class={look.icon}></i>{extra.customBadge.name}
                </span>
              {/if}
            </div>
          {/if}
          <div class="meta">
            <span
              ><Flag country={base.country} /> {countryNames.of(base.country) ?? base.country}</span
            >
            <span class="status" class:on={base.is_online}
              >{base.is_online ? 'Online' : 'Offline'}</span
            >
            {#if extra?.usernameAka}<span>Also known as: <b>{extra.usernameAka}</b></span>{/if}
          </div>
          <div class="meta">
            {#if base.registered_at > 0}<span
                >Join date: <b>{monthYear(base.registered_at)}</b></span
              >{/if}
            {#if base.latest_activity > 0}
              <span>Last seen: <b>{timeAgo(base.latest_activity)}</b></span>
            {/if}
            {#if playing}<span>Playing with: <b>{playing}</b></span>{/if}
          </div>
          {#if base.discord?.username || extra?.bancho}
            <div class="accounts">
              {#if base.discord?.username}
                <span class="account account-discord" title="Discord">
                  <i class="fa-brands fa-discord"></i>@{base.discord.username}
                </span>
              {/if}
              {#if extra?.bancho}
                <a
                  class="account account-bancho"
                  href="https://osu.ppy.sh/users/{extra.bancho.id}"
                  title="Bancho"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="/img/modes/mode-0.png" alt="" />{extra.bancho.username}
                </a>
              {/if}
            </div>
          {/if}
        {:else}
          <h1>…</h1>
        {/if}
      </div>
      {#if !own && base}<FriendButton {id} />{/if}
    </div>
  </section>

  <div class="mode-bar mode-switch">
    <div class="wrap">
      <RelaxTabs rx={view.rx} onselect={(rx) => go({ rx })} />
      <ModeTabs mode={view.mode} rx={view.rx} onselect={(mode) => go({ mode })} />
    </div>
  </div>

  <AlertStack />
  {#if extra?.silence}
    <div class="wrap">
      <div class="notice alert profile-state c-red">
        <i class="fa-solid fa-comment-slash notice-icon"></i>
        <div>
          <b>This player is silenced</b>
          Reason: {extra.silence.reason}. The silence ends {fullDate(extra.silence.end)}.
        </div>
      </div>
    </div>
  {/if}
  {#if extra?.frozen}
    <div class="wrap">
      <div class="notice alert profile-state c-yellow">
        <i class="fa-solid fa-snowflake notice-icon"></i>
        <div>
          <b>This player is frozen</b>
          They have to provide a liveplay, or they'll be restricted automatically.
        </div>
      </div>
    </div>
  {/if}
  {#if isBot}
    <div class="wrap">
      <div class="notice alert profile-state c-blue">
        <i class="fa-solid fa-robot notice-icon"></i>
        <div>
          <b>This is a bot account</b>
          It does not represent a player, but offers in-game functionality.
        </div>
      </div>
    </div>
  {/if}

  <main class="wrap profile">
    <aside>
      {#each visited as pane (pane)}
        <div class="mode-pane" data-pane={pane} hidden={pane !== key}>
          {#if loaded[pane]}
            {#if loaded[pane].stats.playcount === 0}
              <div class="panel empty-mode c-blue">
                <img src="/img/modes/mode-{pane.split('-')[0]}.png" alt="" />
                <p>
                  {loaded[pane].username} hasn't played {modeNames[Number(pane.split('-')[0])]} on
                  {relaxNames[Number(pane.split('-')[1])].toLowerCase()} yet.
                </p>
              </div>
            {:else}
              <ProfileStats
                stats={loaded[pane].stats}
                country={countryNames.of(loaded[pane].country) ?? loaded[pane].country}
                peakRank={peak[pane] ?? null}
              />
            {/if}
          {:else}
            <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
          {/if}
        </div>
      {/each}
    </aside>

    <div>
      {#if page_.state.status === 'ready' && page_.state.data.content.trim()}
        <SectionTitle colour="c-pink" icon="fa-heart">me!</SectionTitle>
        <div class="panel c-pink"><Userpage content={page_.state.data.content} /></div>
      {/if}

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
                firstPlaces={loaded[pane].stats.first_places}
                pinned={pinned[pane] ?? null}
                ondetails={(score) => {
                  detail = score;
                  detailOpen = true;
                }}
                onpin={(score) => {
                  pinTarget = score;
                  pinOpen = true;
                }}
              />
            </div>
          {/if}
        {/each}
      {/key}

      <Medals {id} />

      <SectionTitle colour="c-teal" icon="fa-comments">
        Comments <small>{number(commentTotal)}</small>
      </SectionTitle>
      <Comments
        profileId={id}
        disabled={extra?.commentsDisabled ?? false}
        bind:total={commentTotal}
      />
    </div>
  </main>

  <ScoreDialog score={detail} bind:open={detailOpen} />
  <PinDialog
    score={pinTarget}
    pinned={pinIsPinned}
    rx={view.rx}
    bind:open={pinOpen}
    ondone={() => refresh++}
  />
{/if}
