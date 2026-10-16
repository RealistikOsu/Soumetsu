<script lang="ts">
  import { page } from '$app/state';
  import { tabInk } from '@soumetsu/ui';
  import { bannerUrl } from '$lib/assets';
  import { Privilege } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { badgeIcon } from '$lib/badges';
  import { countryName } from '$lib/countries';
  import { decorationClass } from '$lib/decorations';
  import { monthYear, timeAgo } from '$lib/format';
  import { m } from '$lib/paraglide/messages';
  import { playStyleNames } from '$lib/playstyles';
  import { getProfile } from '$lib/profile';
  import Avatar from './Avatar.svelte';
  import BannerImage from './BannerImage.svelte';
  import Flag from './Flag.svelte';
  import FriendButton from './FriendButton.svelte';
  import PastNames from './PastNames.svelte';
  import ReportUser from './ReportUser.svelte';

  const profile = getProfile();
  const id = $derived(profile.id);
  const base = $derived(profile.base);
  const extra = $derived(profile.extra);

  const playStyles = playStyleNames();
  const playing = $derived(
    playStyles.filter((_, i) => (extra?.playStyle ?? 0) & (1 << i)).join(', ')
  );
  const staff = $derived(
    !!session.user && (session.user.privileges & Privilege.AdminManageUsers) > 0
  );

  const pages = $derived([
    { href: `/users/${id}`, label: m.profile_page_profile() },
    { href: `/users/${id}/multiplayer`, label: m.multiplayer_title() },
    { href: `/users/${id}/ranked-play`, label: m.ranked_title() }
  ]);

  let menu = $state<HTMLDetailsElement>();
  let reporting = $state(false);
</script>

<svelte:window
  onclick={(event) => {
    if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
  }}
/>

<!-- An uploaded banner sits over the default one, which shows if the file is missing. -->
<section
  class="profile-head"
  style={extra?.banner?.type === 2
    ? `background-color: ${extra.banner.value}`
    : 'background-image: url(/img/banner-default.png)'}
>
  {#if extra?.banner?.type === 1}
    <BannerImage src={bannerUrl(id)} position={extra.banner} />
  {/if}
  <div class="wrap head-top">
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
          {#if extra?.pastNames.length}<PastNames names={extra.pastNames} />{/if}
        </div>
        {#if extra && (extra.badges.length || extra.customBadge)}
          <div class="badges">
            {#each extra.badges as badge (badge.name)}
              {@const look = badgeIcon(badge.icon)}
              <span class="badge {look.colour}"><i class={look.icon}></i>{badge.name}</span>
            {/each}
            {#if extra.customBadge}
              {@const look = badgeIcon(extra.customBadge.icon)}
              <span class="badge custom {look.colour}" title={m.profile_head_custom_badge()}>
                <i class={look.icon}></i>{extra.customBadge.name}
              </span>
            {/if}
          </div>
        {/if}
        <div class="meta">
          <span><Flag country={base.country} /> {countryName(base.country)}</span>
          <span class="status" class:on={extra?.online}
            >{extra?.online ? m.profile_head_online() : m.profile_head_offline()}</span
          >
          {#if base.registered_at > 0}<span
              >{m.profile_head_join_date()} <b>{monthYear(base.registered_at)}</b></span
            >{/if}
          {#if base.latest_activity > 0 && !extra?.online}
            <span>{m.profile_head_last_seen()} <b>{timeAgo(base.latest_activity)}</b></span>
          {/if}
          {#if playing}<span>{m.profile_head_playing_with()} <b>{playing}</b></span>{/if}
          {#if extra?.usernameAka}<span
              >{m.profile_head_also_known_as()} <b>{extra.usernameAka}</b></span
            >{/if}
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
    <div class="head-actions">
      {#if !profile.own && base}<FriendButton {id} />{/if}
      {#if session.user && !profile.own && base}
        <a
          class="btn head-message"
          href="/messages?with={id}"
          title={m.messages_message()}
          aria-label={m.messages_message()}
        >
          <i class="fa-solid fa-envelope"></i>
        </a>
      {/if}
      {#if base && ((session.user && !profile.own) || staff)}
        <details class="score-menu head-menu" bind:this={menu}>
          <summary
            class="btn"
            title={m.profile_more_actions()}
            aria-label={m.profile_more_actions()}><i class="fa-solid fa-ellipsis"></i></summary
          >
          <div>
            {#if staff}
              <a href="/admin/users/{id}"
                ><i class="fa-solid fa-pen-to-square"></i>{m.profile_staff_edit()}</a
              >
            {/if}
            {#if session.user && !profile.own}
              <button
                class="report-user"
                type="button"
                onclick={() => {
                  menu!.open = false;
                  reporting = true;
                }}
              >
                <i class="fa-solid fa-flag"></i>{m.profile_report()}
              </button>
            {/if}
          </div>
        </details>
        <!-- outside the menu: a closed <details> hides everything in it, the dialog included -->
        {#if session.user && !profile.own}
          <ReportUser {id} username={base.username} bind:open={reporting} />
        {/if}
      {/if}
    </div>
  </div>
  <nav class="wrap head-pages" use:tabInk>
    {#each pages as link (link.href)}
      <a href={link.href} class:active={page.url.pathname === link.href}>{link.label}</a>
    {/each}
  </nav>
</section>
