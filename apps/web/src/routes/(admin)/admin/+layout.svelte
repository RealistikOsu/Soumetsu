<script lang="ts">
  import type { Snippet } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminSections } from '$lib/admin';
  import { hasPrivilege, isStaff } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { flash } from '$lib/flash.svelte';
  import '../../../styles/admin.css';

  let { children }: { children: Snippet } = $props();

  const user = $derived(session.user);
  const staff = $derived(!!user && isStaff(user.privileges));
  const sections = $derived(
    adminSections
      .map((section) => ({
        ...section,
        pages: section.pages.filter((p) => user && hasPrivilege(user.privileges, p.needs))
      }))
      .filter((section) => section.pages.length)
  );
  const here = $derived(
    adminSections.flatMap((s) => s.pages).find((p) => p.href === page.url.pathname)
  );
  const allowed = $derived(!here || (!!user && hasPrivilege(user.privileges, here.needs)));

  // Logged-out visitors are sent to log in. Everyone else without staff access sees a plain not-found page,
  // so the panel's existence isn't advertised.
  $effect(() => {
    if (!session.ready || session.user) return;
    flash.next('warning', 'You need to login first.');
    goto(`/login?redir=${encodeURIComponent(page.url.pathname)}`, { replaceState: true });
  });
</script>

<svelte:head><title>{here?.label ?? 'Admin'} · Admin · RealistikOsu</title></svelte:head>

{#if user && !staff}
  <NotFound />
{:else if user}
  <Banner url="/img/admin/banner.jpg" class="admin-banner">
    <div>
      <span class="admin-eyebrow"><i class="fa-solid fa-shield-halved"></i>Admin</span>
      <h1>RealistikPanel</h1>
      <p class="sub">Signed in as {user.username}</p>
    </div>
  </Banner>

  <main class="wrap admin-layout">
    <nav class="settings-menu admin-sections">
      {#each sections as section (section.name)}
        <span>{section.name}</span>
        {#each section.pages as item (item.href)}
          <a
            class="{item.colour} {item.href === page.url.pathname ? 'active' : ''}"
            href={item.href}
          >
            <i class="fa-solid {item.icon}"></i>{item.label}
          </a>
        {/each}
      {/each}
    </nav>
    <div class="admin-content">
      {#if allowed}
        {@render children()}
      {:else}
        <p class="panel empty-note">You do not have sufficient privileges to visit this area!</p>
      {/if}
    </div>
  </main>
{/if}
