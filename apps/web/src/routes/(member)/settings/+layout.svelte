<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import Banner from '$lib/components/Banner.svelte';
  import { site } from '$lib/site.svelte';

  let { children }: { children: Snippet } = $props();

  const tabs = $derived([
    ['/settings', 'Profile', 'c-blue', 'fa-user'],
    ['/settings/userpage', 'Userpage', 'c-pink', 'fa-file-lines'],
    ['/settings/avatar', 'Avatar', 'c-teal', 'fa-image'],
    ['/settings/password', 'Password', 'c-orange', 'fa-key'],
    ['/settings/discord-integration', 'Discord linking', 'c-discord', 'fa-discord'],
    ...(site.info?.twitchConfigured
      ? [['/settings/twitch', 'Twitch requests', 'c-purple', 'fa-twitch']]
      : []),
    ...(site.info?.banchoConfigured
      ? [['/settings/bancho', 'Bancho linking', 'c-lblue', 'fa-link']]
      : []),
    ['/settings/decoration', 'Name decoration', 'c-yellow', 'fa-palette'],
    ['/settings/profbanner', 'Profile banner', 'c-green', 'fa-panorama', true],
    ['/settings/change-username', 'Change username', 'c-red', 'fa-pen', true]
  ] as [string, string, string, string, boolean?][]);
</script>

<svelte:head><title>Settings · RealistikOsu</title></svelte:head>

<Banner image="settings.jpg"><h1>Settings</h1></Banner>

<main class="wrap settings">
  <nav class="settings-menu">
    {#each tabs as [href, name, colour, icon, supporter] (href)}
      <a class="{colour} {page.url.pathname === href ? 'active' : ''}" {href}>
        <i class="{icon === 'fa-discord' || icon === 'fa-twitch' ? 'fa-brands' : 'fa-solid'} {icon}"
        ></i>{name}
        {#if supporter}<span class="supporter">Supporter</span>{/if}
      </a>
    {/each}
  </nav>

  <div class="settings-body">{@render children()}</div>
</main>
