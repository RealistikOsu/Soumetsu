<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/state';
  import { listen } from '$lib/api/chat';
  import { isStaff } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import { inbox } from '$lib/inbox.svelte';
  import { commissions } from '$lib/api/commissions';
  import { query } from '$lib/api/query.svelte';
  import { m } from '$lib/paraglide/messages';
  import Avatar from './Avatar.svelte';
  import PlayerSearch from './PlayerSearch.svelte';

  interface Item {
    href: string;
    icon: string;
    text: string;
    brand?: boolean;
    badge?: string;
  }

  interface Menu {
    label: string;
    colour: string;
    icon: string;
    prefixes: string[];
    items: Item[];
  }

  const user = $derived(session.user);
  const path = $derived(page.url.pathname);

  const commissionsQuery = query((signal) =>
    session.user ? commissions(signal) : Promise.resolve(null)
  );
  const tasks = $derived(
    commissionsQuery.state.status === 'ready' && commissionsQuery.state.data
      ? commissionsQuery.state.data.day.tasks
      : null
  );
  const done = $derived(tasks ? tasks.filter((t) => t.completed).length : null);

  // Messages sent from the site arrive over the stream. The check now and then while the tab is in view
  // covers in-game ones, and mobile browsers freeze timers and streams in the background, so coming back
  // to the tab checks straight away.
  $effect(() => {
    if (!user) return;
    const stream = new AbortController();
    listen((peer) => inbox.notify(peer), stream.signal);
    const refresh = () => {
      if (document.visibilityState === 'visible') inbox.refresh();
    };
    inbox.refresh();
    const timer = setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      stream.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  });

  const menus: Menu[] = $derived([
    {
      label: m.common_header_play(),
      colour: 'c-red',
      icon: 'fa-gamepad',
      prefixes: ['/daily-challenge', '/commissions'],
      items: [
        {
          href: '/daily-challenge',
          icon: 'fa-calendar-day',
          text: m.common_header_daily_challenge()
        },
        ...(user
          ? [
              {
                href: '/commissions',
                icon: 'fa-clipboard-check',
                text: m.common_header_commissions(),
                badge:
                  done !== null && tasks
                    ? m.commissions_header_badge({ done, total: tasks.length })
                    : undefined
              }
            ]
          : [])
      ]
    },
    {
      label: m.common_nav_beatmaps(),
      colour: 'c-lblue',
      icon: 'fa-music',
      prefixes: ['/beatmap_listing', '/beatmaps/', '/rank-request', '/upload-requests'],
      items: [
        { href: '/beatmap_listing', icon: 'fa-list', text: m.common_header_beatmap_listing() },
        { href: '/rank-request', icon: 'fa-paper-plane', text: m.common_header_request_beatmap() },
        {
          href: '/upload-requests',
          icon: 'fa-circle-play',
          text: m.common_header_upload_requests()
        }
      ]
    },
    {
      label: m.common_header_community(),
      colour: 'c-purple',
      icon: 'fa-users',
      prefixes: ['/clanboard', '/c/', '/clan/', '/clans/', '/team'],
      items: [
        ...(user
          ? [
              ...(user.clan
                ? [{ href: `/c/${user.clan.id}`, icon: 'fa-flag', text: m.common_header_my_clan() }]
                : [
                    { href: '/clans/create', icon: 'fa-plus', text: m.common_header_create_clan() }
                  ]),
              {
                href: '/clan/manage',
                icon: 'fa-pen-to-square',
                text: m.common_header_manage_clan()
              }
            ]
          : []),
        { href: '/clanboard', icon: 'fa-shield-halved', text: m.common_header_clans() },
        { href: '/team', icon: 'fa-user-group', text: m.common_header_team() },
        { href: '/discord', icon: 'fa-discord', text: 'Discord', brand: true }
      ]
    },
    {
      label: m.common_header_help(),
      colour: 'c-green',
      icon: 'fa-life-ring',
      prefixes: ['/doc', '/connect', '/patcher'],
      items: [
        { href: '/doc/rules', icon: 'fa-scale-balanced', text: m.common_header_rules() },
        { href: '/doc', icon: 'fa-book', text: m.common_nav_documentation() },
        { href: '/connect', icon: 'fa-plug', text: m.common_header_connection_guide() },
        { href: '/patcher', icon: 'fa-screwdriver-wrench', text: m.common_header_patcher() }
      ]
    }
  ]);

  let openMenu = $state<string | null>(null);
  let mobileOpen = $state(false);
  let meOpen = $state(false);

  const isActive = (prefixes: string[]) => prefixes.some((prefix) => path.startsWith(prefix));

  afterNavigate(() => {
    openMenu = null;
    mobileOpen = false;
    meOpen = false;
  });

  function onWindowClick(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.nav-menu')) openMenu = null;
    if (!target.closest('.me')) meOpen = false;
  }

  function onWindowKey(event: KeyboardEvent) {
    if (event.key === 'Escape') openMenu = null;
  }

  function hover(event: PointerEvent, label: string) {
    if (event.pointerType === 'mouse' && openMenu && openMenu !== label) openMenu = label;
  }

  async function logOut(event: MouseEvent) {
    event.preventDefault();
    await session.logout();
    flash.next('success', m.common_header_logged_out());
    await goto('/');
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKey} />

<header class="top" class:open={mobileOpen}>
  <div class="wrap">
    <a class="logo" href="/"><img src="/img/logo.png" alt="RealistikOsu" /></a>
    <nav class="nav">
      <a class="c-yellow" class:active={path.startsWith('/leaderboard')} href="/leaderboard">
        <i class="fa-solid fa-trophy"></i>{m.common_nav_leaderboard()}
      </a>
      {#each menus as menu (menu.label)}
        <div
          class="nav-menu {menu.colour}"
          class:active={isActive(menu.prefixes)}
          class:open={openMenu === menu.label}
          onpointerenter={(event) => hover(event, menu.label)}
          role="presentation"
        >
          <button
            type="button"
            aria-expanded={openMenu === menu.label}
            onclick={() => (openMenu = openMenu === menu.label ? null : menu.label)}
          >
            <i class="fa-solid {menu.icon}"></i>{menu.label}<i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="nav-drop">
            {#each menu.items as item (item.href)}
              <a href={item.href}>
                <i class="{item.brand ? 'fa-brands' : 'fa-solid'} {item.icon}"></i>{item.text}
                {#if item.badge}<span class="me-badge">{item.badge}</span>{/if}
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </nav>
    <PlayerSearch />
    <div class="top-right">
      {#if user}
        <a class="support-us c-pink" class:active={path.startsWith('/donate')} href="/donate">
          <i class="fa-solid fa-heart"></i><span>{m.common_header_support_us()}</span>
        </a>
        <a
          class="inbox"
          class:active={path.startsWith('/messages')}
          href="/messages"
          title={m.common_header_messages()}
          aria-label={m.common_header_messages()}
        >
          <i class="fa-solid fa-envelope"></i>
          {#if inbox.unread}<span class="inbox-count"
              >{inbox.unread > 99 ? '99+' : inbox.unread}</span
            >{/if}
        </a>
        <details class="me" bind:open={meOpen}>
          <summary title={user.username}><Avatar id={user.id} /></summary>
          <nav class="me-menu">
            <a href="/users/{user.id}"
              ><i class="fa-solid fa-user"></i>{m.common_header_profile()}</a
            >
            <a href="/friends"><i class="fa-solid fa-user-group"></i>{m.common_header_friends()}</a>
            <a href="/settings"><i class="fa-solid fa-gear"></i>{m.common_header_settings()}</a>
            {#if isStaff(user.privileges)}
              <a href="/admin">
                <i class="fa-solid fa-screwdriver-wrench"></i>{m.common_header_admin_panel()}
              </a>
            {/if}
            <a href="/logout" onclick={logOut}>
              <i class="fa-solid fa-right-from-bracket"></i>{m.common_header_log_out()}
            </a>
          </nav>
        </details>
      {:else if session.ready}
        <a class="guest" href="/login">{m.common_header_log_in()}</a>
        <a class="guest" href="/register">{m.common_header_register()}</a>
      {/if}
      <button
        class="menu-toggle"
        type="button"
        aria-label={m.common_header_menu()}
        aria-expanded={mobileOpen}
        onclick={() => (mobileOpen = !mobileOpen)}
      >
        <i class="fa-solid {mobileOpen ? 'fa-xmark' : 'fa-bars'}"></i>
      </button>
    </div>
  </div>
</header>
