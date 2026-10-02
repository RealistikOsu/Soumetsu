<script lang="ts">
  import { goto } from '$app/navigation';
  import { clanNamePattern, clanTagPattern, createClan, uploadClanIcon } from '$lib/api/clans';
  import { describe } from '$lib/api/messages';
  import { session } from '$lib/auth/session.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import ClanBadge from '$lib/components/ClanBadge.svelte';
  import ClanFields from '$lib/components/ClanFields.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { site } from '$lib/site.svelte';

  let name = $state('');
  let tag = $state('');
  let description = $state('');
  let icon = $state<File | null>(null);
  let busy = $state(false);

  const iconPreview = $derived(icon ? URL.createObjectURL(icon) : null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!clanNamePattern.test(name.trim()) || !clanTagPattern.test(tag.trim())) {
      return flash.show('error', 'Check the clan name and tag, then try again.');
    }
    busy = true;
    try {
      const created = await createClan({ name: name.trim(), tag: tag.trim(), description });
      // The clan exists now, so a logo that fails to upload can be added later from Manage clan.
      if (icon) await uploadClanIcon(created.id, icon).catch(() => null);
      flash.next('success', 'Clan created.');
      await session.start();
      await goto(`/c/${created.id}`);
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Create a clan · RealistikOsu</title></svelte:head>

<Banner image="clans.jpg">
  <div>
    <h1>Create a clan</h1>
    <p class="sub">Team up with your friends and climb the clan leaderboard together.</p>
  </div>
</Banner>

<main class="wrap clan-form">
  {#if session.user?.clan}
    <p class="panel empty-note">You're already in a clan. Leave it before making a new one.</p>
  {:else if site.info && !site.info.clanCreationEnabled}
    <p class="panel empty-note">Ow, sorry the clan is not available to create right now ;p</p>
  {:else}
    <form onsubmit={submit}>
      <SectionTitle colour="c-purple" icon="fa-shield-halved">Your clan</SectionTitle>
      <div class="panel form-panel c-purple">
        <ClanFields bind:name bind:tag bind:description bind:icon />
      </div>
      <div class="form-actions">
        <button class="btn btn-blue" type="submit" disabled={busy}>
          <i class="fa-solid fa-plus"></i>Create clan
        </button>
      </div>
    </form>
    <aside>
      <SectionTitle colour="c-yellow" icon="fa-eye">Preview</SectionTitle>
      <div class="panel clan-preview c-purple">
        <ClanBadge tag={tag || 'TAG'} size="large" preview={iconPreview} />
        <div>
          <span class="clan-tag">[{tag || 'TAG'}]</span>
          <b>{name || 'Clan name'}</b>
          <p>{description || 'Your description goes here.'}</p>
        </div>
      </div>
      <p class="faint">
        You'll be the clan's owner. Once it's made, you get an invite link to share from Manage
        clan.
      </p>
    </aside>
  {/if}
</main>
