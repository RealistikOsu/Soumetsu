<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminAreas, dashboardPage, setAdminNav, waitingIn } from '$lib/admin';
  import { adminWaiting } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import { hasPrivilege, isStaff, Privilege } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import AdminSearch from '$lib/components/admin/AdminSearch.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { flash } from '$lib/flash.svelte';
  import '../../../styles/admin.css';

  let { children }: { children: Snippet } = $props();

  const user = $derived(session.user);
  const staff = $derived(!!user && isStaff(user.privileges));
  const areas = $derived(
    adminAreas
      .map((area) => ({
        ...area,
        pages: area.pages.filter((p) => user && hasPrivilege(user.privileges, p.needs))
      }))
      .filter((area) => area.pages.length)
  );
  const isHere = (href: string) =>
    href === '/admin' ? page.url.pathname === href : page.url.pathname.startsWith(href);
  const here = $derived(
    [dashboardPage, ...adminAreas.flatMap((a) => a.pages)].find((p) => isHere(p.href))
  );
  const area = $derived(areas.find((a) => a.pages.some((p) => isHere(p.href))));
  const allowed = $derived(!here || (!!user && hasPrivilege(user.privileges, here.needs)));

  // Refetched on every navigation, so handling a report updates the tab's count.
  const waiting = query((signal) => {
    void page.url.pathname;
    return adminWaiting(signal);
  });
  const counts = $derived(waiting.state.status === 'ready' ? waiting.state.data : null);
  setAdminNav({
    get areas() {
      return areas;
    },
    get waiting() {
      return counts;
    }
  });

  let searching = $state(false);

  // Logged-out visitors are sent to log in. Everyone else without staff access sees a plain not-found page,
  // so the panel's existence isn't advertised.
  $effect(() => {
    if (!session.ready || session.user) return;
    flash.next('warning', 'You need to login first.');
    goto(`/login?redir=${encodeURIComponent(page.url.pathname)}`, { replaceState: true });
  });
</script>

<svelte:window
  onkeydown={(event) => {
    const typing =
      event.target instanceof Element && event.target.closest('input, textarea, select');
    if (!staff || session.needsTwoFactor) return;
    if ((event.key === '/' && !typing) || (event.key === 'k' && (event.ctrlKey || event.metaKey))) {
      event.preventDefault();
      searching = true;
    }
  }}
/>

<svelte:head><title>{here?.label ?? 'Admin'} · Admin · RealistikOsu</title></svelte:head>

{#if session.needsTwoFactor}
  <main class="wrap">
    <div class="notice alert profile-state c-orange">
      <i class="fa-solid fa-shield-halved notice-icon"></i>
      <div>
        <b>Two-factor required</b>
        Staff privileges only work in a login that passed two-factor authentication.
        <a href="/settings/2fa">Set it up</a>, or if it's already on, log out and log in again with
        your code.
      </div>
    </div>
  </main>
{:else if user && !staff}
  <NotFound />
{:else if user}
  <div class="admin">
    <div class="admin-bar">
      <div class="wrap">
        <div class="admin-bar-row">
          <a class="admin-title" href="/admin"
            ><i class="fa-solid fa-shield-halved"></i>RealistikPanel</a
          >
          <button
            class="admin-find"
            type="button"
            aria-label="Search users and pages"
            onclick={() => (searching = true)}
          >
            <i class="fa-solid fa-magnifying-glass"></i>
            <span>Search users and pages</span>
            <kbd>/</kbd>
          </button>
        </div>
        <nav class="admin-areas" aria-label="Admin areas">
          {#each areas as item (item.key)}
            {@const count = waitingIn(item.pages, counts)}
            <a class="{item.colour} {item === area ? 'active' : ''}" href={item.pages[0].href}>
              <i class="fa-solid {item.icon}"></i>{item.name}
              {#if count}<small>{count}</small>{/if}
            </a>
          {/each}
        </nav>
      </div>
      {#if area}
        <nav class="wrap admin-pages {area.colour}" aria-label="{area.name} pages">
          {#each area.pages as item (item.href)}
            {@const count = item.waiting ? counts?.[item.waiting] : 0}
            <a class:active={isHere(item.href)} href={item.href}>
              {item.label}
              {#if count}<small>{count}</small>{/if}
            </a>
          {/each}
        </nav>
      {/if}
    </div>

    <main class="wrap admin-main">
      {#if allowed}
        {@render children()}
      {:else}
        <p class="panel empty-note">You do not have sufficient privileges to visit this area!</p>
      {/if}
    </main>

    <AdminSearch
      bind:open={searching}
      {areas}
      waiting={counts}
      canUsers={hasPrivilege(user.privileges, Privilege.AdminManageUsers)}
      canIps={hasPrivilege(user.privileges, Privilege.PanelViewIps)}
    />
  </div>
{/if}
