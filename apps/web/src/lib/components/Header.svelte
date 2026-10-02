<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/state';
  import { isStaff } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import Avatar from './Avatar.svelte';
  import PlayerSearch from './PlayerSearch.svelte';

  interface Item {
    href: string;
    icon: string;
    text: string;
    brand?: boolean;
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

  const menus: Menu[] = $derived([
    {
      label: 'Clan',
      colour: 'c-purple',
      icon: 'fa-shield-halved',
      prefixes: ['/clanboard', '/c/', '/clan/', '/clans/'],
      items: [
        ...(user
          ? [
              ...(user.clan
                ? [{ href: `/c/${user.clan.id}`, icon: 'fa-flag', text: 'My clan' }]
                : [{ href: '/clans/create', icon: 'fa-plus', text: 'Create a clan' }]),
              { href: '/clan/manage', icon: 'fa-pen-to-square', text: 'Manage clan' }
            ]
          : []),
        { href: '/clanboard', icon: 'fa-trophy', text: 'Leaderboard' }
      ]
    },
    {
      label: 'Support',
      colour: 'c-green',
      icon: 'fa-life-ring',
      prefixes: ['/doc', '/connect', '/patcher', '/team'],
      items: [
        { href: '/doc/rules', icon: 'fa-scale-balanced', text: 'Rules' },
        { href: '/doc', icon: 'fa-book', text: 'Documentation' },
        { href: '/connect', icon: 'fa-plug', text: 'Connection guide' },
        { href: '/patcher', icon: 'fa-screwdriver-wrench', text: 'Patcher' },
        { href: '/discord', icon: 'fa-discord', text: 'Discord', brand: true },
        { href: '/team', icon: 'fa-users', text: 'Our team' }
      ]
    },
    {
      label: 'Beatmaps',
      colour: 'c-lblue',
      icon: 'fa-music',
      prefixes: ['/beatmap_listing', '/beatmaps/', '/rank-request'],
      items: [
        { href: '/beatmap_listing', icon: 'fa-list', text: 'Beatmap listing' },
        ...(user
          ? [{ href: '/rank-request', icon: 'fa-paper-plane', text: 'Request beatmap' }]
          : [])
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
    flash.next('success', 'Successfully logged out.');
    await goto('/');
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKey} />

<header class="top" class:open={mobileOpen}>
  <div class="wrap">
    <a class="logo" href="/"><img src="/img/logo.png" alt="RealistikOsu" /></a>
    <nav class="nav">
      <a class="c-yellow" class:active={path.startsWith('/leaderboard')} href="/leaderboard">
        <i class="fa-solid fa-trophy"></i>Leaderboard
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
          <i class="fa-solid fa-heart"></i><span>Support us</span>
        </a>
        <details class="me" bind:open={meOpen}>
          <summary title={user.username}><Avatar id={user.id} /></summary>
          <nav class="me-menu">
            <a href="/users/{user.id}"><i class="fa-solid fa-user"></i>Profile</a>
            <a href="/friends"><i class="fa-solid fa-user-group"></i>Friends</a>
            <a href="/settings"><i class="fa-solid fa-gear"></i>Settings</a>
            {#if isStaff(user.privileges)}
              <a href="/admin">
                <i class="fa-solid fa-screwdriver-wrench"></i>Admin panel
              </a>
            {/if}
            <a href="/logout" onclick={logOut}>
              <i class="fa-solid fa-right-from-bracket"></i>Log out
            </a>
          </nav>
        </details>
      {:else if session.ready}
        <a class="guest" href="/login">Log in</a>
        <a class="guest" href="/register">Register</a>
      {/if}
      <button
        class="menu-toggle"
        type="button"
        aria-label="Menu"
        aria-expanded={mobileOpen}
        onclick={() => (mobileOpen = !mobileOpen)}
      >
        <i class="fa-solid {mobileOpen ? 'fa-xmark' : 'fa-bars'}"></i>
      </button>
    </div>
  </div>
</header>
