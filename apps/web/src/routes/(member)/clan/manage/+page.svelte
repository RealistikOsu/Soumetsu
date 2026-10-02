<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    clan as loadClan,
    clanInvite,
    clanMembers,
    clanNamePattern,
    clanTagPattern,
    deleteClanIcon,
    disbandClan,
    kickMember,
    newClanInvite,
    updateClan,
    uploadClanIcon,
    type Clan,
    type ClanMember
  } from '$lib/api/clans';
  import { describe } from '$lib/api/messages';
  import { session } from '$lib/auth/session.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import ClanBadge from '$lib/components/ClanBadge.svelte';
  import ClanFields from '$lib/components/ClanFields.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  const clanId = $derived(session.user?.clan?.id ?? null);

  let clan = $state.raw<Clan | null>(null);
  let members = $state.raw<ClanMember[]>([]);
  let invite = $state('');
  let denied = $state(false);

  let name = $state('');
  let tag = $state('');
  let description = $state('');
  let icon = $state<File | null>(null);
  let iconVersion = $state(0);
  let busy = $state(false);
  let disbanding = $state(false);
  let copied = $state(false);

  const iconPreview = $derived(icon ? URL.createObjectURL(icon) : null);
  const inviteUrl = $derived(invite ? `${location.origin}/clans/invite/${invite}` : '');

  $effect(() => {
    const id = clanId;
    if (id === null) return;
    Promise.all([loadClan(id), clanMembers(id)]).then(
      async ([found, list]) => {
        clan = found;
        members = list;
        name = found.name;
        tag = found.tag;
        description = found.description;
        if (list.find((m) => m.is_owner)?.user_id !== session.user?.id) {
          denied = true;
          return;
        }
        invite = (await clanInvite(id).catch(() => ({ invite: '' }))).invite;
      },
      (error) => flash.show('error', describe(error))
    );
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!clan) return;
    if (!clanNamePattern.test(name.trim()) || !clanTagPattern.test(tag.trim())) {
      return flash.show('error', m.clans_form_check());
    }
    busy = true;
    try {
      clan = await updateClan(clan.id, { name: name.trim(), tag: tag.trim(), description });
      if (icon) {
        await uploadClanIcon(clan.id, icon);
        icon = null;
        iconVersion++;
      }
      flash.show('success', m.clans_success());
      await session.start();
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }

  async function removeIcon() {
    if (!clan) return;
    try {
      await deleteClanIcon(clan.id);
      iconVersion++;
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  async function kick(member: ClanMember) {
    if (!clan) return;
    try {
      await kickMember(clan.id, member.user_id);
      members = members.filter((m) => m.user_id !== member.user_id);
      flash.show('success', m.clans_success());
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  async function rotate() {
    if (!clan) return;
    try {
      invite = (await newClanInvite(clan.id)).invite;
      flash.show('success', m.clans_success());
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  async function disband() {
    if (!clan) return;
    try {
      await disbandClan(clan.id);
      flash.next('success', m.clans_manage_disbanded());
      disbanding = false;
      await session.start();
      await goto('/');
    } catch (error) {
      disbanding = false;
      flash.show('error', describe(error));
    }
  }
</script>

<svelte:head><title>{m.clans_manage_clan()} · RealistikOsu</title></svelte:head>

<Banner image="clans.jpg" class="clan-banner">
  {#if clan}
    {#key iconVersion}<ClanBadge id={clan.id} tag={clan.tag} size="large" />{/key}
    <div>
      <span class="clan-tag">[{clan.tag}]</span>
      <h1>{m.clans_manage_clan()}</h1>
      <p class="sub"><a href="/c/{clan.id}">{clan.name}</a></p>
    </div>
  {:else}
    <div><h1>{m.clans_manage_clan()}</h1></div>
  {/if}
</Banner>

<main class="wrap clan-form">
  {#if clanId === null}
    <p class="panel empty-note">
      {m.clans_manage_no_clan()}
      <a href="/clans/create">{m.clans_manage_no_clan_link()}</a>
      {m.clans_manage_no_clan_after()}
    </p>
  {:else if denied}
    <p class="panel empty-note">{m.clans_manage_denied()}</p>
  {:else if clan}
    <form onsubmit={save}>
      <SectionTitle colour="c-blue" icon="fa-pen-to-square">{m.clans_manage_details()}</SectionTitle
      >
      <div class="panel form-panel c-blue">
        <ClanFields bind:name bind:tag bind:description bind:icon multiline />
        <div class="avatar-actions">
          {#if iconPreview}<ClanBadge {tag} size="large" preview={iconPreview} />{/if}
          <button class="btn" type="button" onclick={removeIcon}>
            <i class="fa-solid fa-trash"></i>{m.clans_manage_remove_logo()}
          </button>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-blue" type="submit" disabled={busy}>{m.clans_manage_save()}</button>
      </div>

      <SectionTitle colour="c-teal" icon="fa-users">
        {m.clans_members()} <small>{members.length}</small>
      </SectionTitle>
      <ul class="panel roster c-teal">
        {#each members as member (member.user_id)}
          <li>
            <Avatar id={member.user_id} />
            <a href="/users/{member.user_id}"><Flag country={member.country} />{member.username}</a>
            <span>{member.is_owner ? m.clans_manage_owner() : ''}</span>
            {#if !member.is_owner}
              <button class="btn kick" type="button" onclick={() => kick(member)}>
                <i class="fa-solid fa-user-minus"></i>{m.clans_manage_kick()}
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    </form>
    <aside>
      <SectionTitle colour="c-green" icon="fa-link">{m.clans_manage_invite_link()}</SectionTitle>
      <div class="panel invite c-green">
        <p class="muted">{m.clans_manage_invite_note()}</p>
        <input
          class="invite-link"
          type="text"
          value={inviteUrl}
          readonly
          aria-label={m.clans_manage_invite_link()}
        />
        <div class="avatar-actions">
          <button class="btn copy" class:copied type="button" onclick={copy} disabled={!invite}>
            <i class="fa-regular fa-copy"></i>{m.clans_manage_copy()}
          </button>
          <button class="btn btn-green" type="button" onclick={rotate}>
            <i class="fa-solid fa-rotate"></i>{m.clans_manage_new_invite()}
          </button>
        </div>
        <small class="faint">{m.clans_manage_invite_rotate_note()}</small>
      </div>

      <SectionTitle colour="c-red" icon="fa-triangle-exclamation"
        >{m.clans_disband_clan()}</SectionTitle
      >
      <div class="panel invite c-red">
        <p class="muted">{m.clans_manage_disband_note()}</p>
        <button class="btn btn-red" type="button" onclick={() => (disbanding = true)}>
          <i class="fa-solid fa-ban"></i>{m.clans_disband_clan()}
        </button>
      </div>
    </aside>
  {/if}
</main>

<Dialog bind:open={disbanding} class="pin-dialog">
  <button class="dialog-close" aria-label={m.clans_close()} onclick={() => (disbanding = false)}>
    <i class="fa-solid fa-xmark"></i>
  </button>
  <h2>{m.clans_manage_disband_confirm()}</h2>
  <p class="muted">{m.clans_manage_disband_warning()}</p>
  <div class="dialog-actions">
    <button class="btn btn-red" type="button" onclick={disband}>{m.clans_disband_clan()}</button>
  </div>
</Dialog>
