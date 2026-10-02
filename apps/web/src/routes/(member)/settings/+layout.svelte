<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import Banner from '$lib/components/Banner.svelte';
  import { m } from '$lib/paraglide/messages';
  import { site } from '$lib/site.svelte';

  let { children }: { children: Snippet } = $props();

  const tabs = $derived([
    ['/settings', m.settings_tab_profile(), 'c-blue', 'fa-user'],
    ['/settings/userpage', m.settings_tab_userpage(), 'c-pink', 'fa-file-lines'],
    ['/settings/avatar', m.settings_tab_avatar(), 'c-teal', 'fa-image'],
    ['/settings/password', m.settings_tab_password(), 'c-orange', 'fa-key'],
    ['/settings/discord-integration', m.settings_tab_discord(), 'c-discord', 'fa-discord'],
    ...(site.info?.twitchConfigured
      ? [['/settings/twitch', m.settings_tab_twitch(), 'c-purple', 'fa-twitch']]
      : []),
    ...(site.info?.banchoConfigured
      ? [['/settings/bancho', m.settings_tab_bancho(), 'c-lblue', 'fa-link']]
      : []),
    ['/settings/decoration', m.settings_tab_decoration(), 'c-yellow', 'fa-palette'],
    ['/settings/profbanner', m.settings_tab_banner(), 'c-green', 'fa-panorama', true],
    ['/settings/change-username', m.settings_tab_username(), 'c-red', 'fa-pen', true]
  ] as [string, string, string, string, boolean?][]);
</script>

<svelte:head><title>{m.settings_title()} · RealistikOsu</title></svelte:head>

<Banner image="settings.jpg"><h1>{m.settings_title()}</h1></Banner>

<main class="wrap settings">
  <nav class="settings-menu">
    {#each tabs as [href, name, colour, icon, supporter] (href)}
      <a class="{colour} {page.url.pathname === href ? 'active' : ''}" {href}>
        <i class="{icon === 'fa-discord' || icon === 'fa-twitch' ? 'fa-brands' : 'fa-solid'} {icon}"
        ></i>{name}
        {#if supporter}<span class="supporter">{m.settings_supporter_tag()}</span>{/if}
      </a>
    {/each}
  </nav>

  <div class="settings-body">{@render children()}</div>
</main>
