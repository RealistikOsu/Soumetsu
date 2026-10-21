<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminClan, deleteAdminClan, kickMember, saveAdminClan } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminDialog from '$lib/components/admin/AdminDialog.svelte';
  import AdminTag from '$lib/components/admin/AdminTag.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import ClanBadge from '$lib/components/ClanBadge.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import { flash } from '$lib/flash.svelte';
  import { timeAgo } from '$lib/format';

  const id = $derived(Number(page.params.id));
  let version = $state(0);
  const loaded = query((signal) => {
    void version;
    return adminClan(id, signal);
  });

  let form = $state<{ name: string; tag: string; description: string; limit: number } | null>(null);
  let kicking = $state<{ id: number; username: string } | null>(null);
  let deleting = $state(false);
  let busy = $state(false);

  $effect(() => {
    if (loaded.state.status !== 'ready') return;
    const { name, tag, description, limit } = loaded.state.data;
    form = { name, tag, description, limit };
  });

  async function run(action: () => Promise<unknown>, success: string, then?: () => void) {
    busy = true;
    try {
      await action();
      flash.show('success', success);
      if (then) then();
      else version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
    kicking = null;
    deleting = false;
  }
</script>

<a class="back" href="/admin/clans"><i class="fa-solid fa-arrow-left"></i>Clans</a>

{#if loaded.state.status === 'error'}
  <p class="panel empty-note">{describe(loaded.state.error)}</p>
{:else if loaded.state.status === 'ready' && form}
  {@const clan = loaded.state.data}
  {@const owner = clan.members.find((m) => m.owner)}
  <section class="user-head clan-head-v2">
    <div class="user-top">
      <ClanBadge id={clan.id} tag={clan.tag} size="large" />
      <div class="user-who">
        <div class="user-name">
          <h1>{clan.name}</h1>
          <span class="admin-tag c-purple">{clan.tag}</span>
        </div>
        <div class="user-meta">
          <span>ID <b>{clan.id}</b></span>
          {#if owner}
            <span>Owned by <a href="/admin/users/{owner.id}"><b>{owner.username}</b></a></span>
          {/if}
          <span>{clan.members.length} of {clan.limit} members</span>
        </div>
        {#if clan.description}<p class="clan-desc">{clan.description}</p>{/if}
      </div>
      <div class="user-actions">
        <a class="btn" href="/c/{clan.id}">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>Clan page
        </a>
      </div>
    </div>
  </section>

  <div class="user-split">
    <div class="user-main">
      <form
        class="user-box"
        onsubmit={(event) => {
          event.preventDefault();
          if (form) run(() => saveAdminClan(id, form!), 'Clan edited successfully!');
        }}
      >
        <h2>Details</h2>
        <div class="field-pair">
          <div class="field">
            <label for="clan-name">Name</label>
            <input id="clan-name" bind:value={form.name} />
          </div>
          <div class="field">
            <label for="clan-tag">Tag</label>
            <input id="clan-tag" maxlength="6" bind:value={form.tag} />
          </div>
        </div>
        <div class="field">
          <label for="clan-desc">Description</label>
          <textarea id="clan-desc" rows="3" bind:value={form.description}></textarea>
        </div>
        <div class="field">
          <label for="clan-limit">Member limit</label>
          <input id="clan-limit" type="number" min="1" bind:value={form.limit} />
        </div>
        <div class="form-foot">
          <button class="btn btn-green" type="submit" disabled={busy}>
            <i class="fa-solid fa-floppy-disk"></i>Save
          </button>
        </div>
      </form>
      <div class="user-box danger-rows">
        <h2>Danger zone</h2>
        <button type="button" onclick={() => (deleting = true)}>
          <i class="fa-solid fa-trash-can"></i>
          <span>Delete clan<small>Everyone leaves it. This can't be undone</small></span>
        </button>
      </div>
    </div>

    <aside class="user-box">
      <h2>Members <small>{clan.members.length} of {clan.limit}</small></h2>
      <ol class="member-rows">
        {#each clan.members as member (member.id)}
          <li>
            <span class="who-line">
              <a class="who" href="/admin/users/{member.id}">
                <Flag country={member.country} /><Avatar id={member.id} /><b>{member.username}</b>
              </a>
              {#if member.owner}<AdminTag colour="c-orange">Owner</AdminTag>{/if}
            </span>
            <span class="dim" title="Registered">{timeAgo(member.registered)}</span>
            {#if !member.owner}
              <button
                class="act"
                type="button"
                onclick={() => (kicking = { id: member.id, username: member.username })}
              >
                Kick
              </button>
            {/if}
          </li>
        {:else}
          <li class="faint">Nobody is in this clan.</li>
        {/each}
      </ol>
    </aside>
  </div>

  <AdminDialog
    bind:open={
      () => kicking !== null,
      (value) => {
        if (!value) kicking = null;
      }
    }
    title="Kick from the clan?"
    colour="c-red"
  >
    <p><b>{kicking?.username}</b> is removed from {clan.name}. They can rejoin with an invite.</p>
    {#snippet footer()}
      <button class="btn" onclick={() => (kicking = null)}>Cancel</button>
      <button
        class="btn btn-red"
        disabled={busy}
        onclick={() => kicking && run(() => kickMember(id, kicking!.id), 'Member kicked.')}
      >
        Kick
      </button>
    {/snippet}
  </AdminDialog>

  <AdminDialog bind:open={deleting} title="Delete this clan?" colour="c-red">
    <p>
      {clan.name} is deleted and all {clan.members.length}
      {clan.members.length === 1 ? 'member leaves' : 'members leave'} it. This cannot be undone.
    </p>
    {#snippet footer()}
      <button class="btn" onclick={() => (deleting = false)}>Cancel</button>
      <button
        class="btn btn-red"
        disabled={busy}
        onclick={() =>
          run(
            () => deleteAdminClan(id),
            'Clan deleted.',
            () => goto('/admin/clans')
          )}
      >
        Delete clan
      </button>
    {/snippet}
  </AdminDialog>
{:else}
  <span class="skel" style="width: 100%; height: 140px"></span>
{/if}
