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
  import { m } from '$lib/paraglide/messages';
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
      return flash.show('error', m.clans_form_check());
    }
    busy = true;
    try {
      const created = await createClan({ name: name.trim(), tag: tag.trim(), description });
      // The clan exists now, so a logo that fails to upload can be added later from Manage clan.
      if (icon) await uploadClanIcon(created.id, icon).catch(() => null);
      flash.next('success', m.clans_create_done());
      await session.start();
      await goto(`/c/${created.id}`);
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>{m.clans_create_title()} · RealistikOsu</title></svelte:head>

<Banner image="clans.jpg">
  <div>
    <h1>{m.clans_create_title()}</h1>
    <p class="sub">{m.clans_create_sub()}</p>
  </div>
</Banner>

<main class="wrap clan-form">
  {#if session.user?.clan}
    <p class="panel empty-note">{m.clans_create_already()}</p>
  {:else if site.info && !site.info.clanCreationEnabled}
    <p class="panel empty-note">{m.clans_create_disabled()}</p>
  {:else}
    <form onsubmit={submit}>
      <SectionTitle colour="c-purple" icon="fa-shield-halved"
        >{m.clans_create_your_clan()}</SectionTitle
      >
      <div class="panel form-panel c-purple">
        <ClanFields bind:name bind:tag bind:description bind:icon />
      </div>
      <div class="form-actions">
        <button class="btn btn-blue" type="submit" disabled={busy}>
          <i class="fa-solid fa-plus"></i>{m.clans_create_submit()}
        </button>
      </div>
    </form>
    <aside>
      <SectionTitle colour="c-yellow" icon="fa-eye">{m.clans_create_preview()}</SectionTitle>
      <div class="panel clan-preview c-purple">
        <ClanBadge tag={tag || m.clans_create_preview_tag()} size="large" preview={iconPreview} />
        <div>
          <span class="clan-tag">[{tag || m.clans_create_preview_tag()}]</span>
          <b>{name || m.clans_fields_name()}</b>
          <p>{description || m.clans_create_preview_description()}</p>
        </div>
      </div>
      <p class="faint">
        {m.clans_create_owner_note()}
      </p>
    </aside>
  {/if}
</main>
