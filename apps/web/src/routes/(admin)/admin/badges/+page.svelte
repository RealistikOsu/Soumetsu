<script lang="ts">
  import { badges, createBadge, deleteBadge, saveBadge } from '$lib/api/admin';
  import type { Badge } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminDialog from '$lib/components/admin/AdminDialog.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { badgeIcon } from '$lib/badges';
  import { flash } from '$lib/flash.svelte';

  let version = $state(0);
  const list = query((signal) => {
    void version;
    return badges(signal);
  });

  let editing = $state<{ id: number | null; name: string; icon: string } | null>(null);
  let deleting = $state<Badge | null>(null);
  let busy = $state(false);

  const preview = $derived(editing ? badgeIcon(editing.icon) : null);

  async function run(action: () => Promise<unknown>, success: string) {
    busy = true;
    try {
      await action();
      flash.show('success', success);
      version++;
      editing = null;
      deleting = null;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }

  function save() {
    if (!editing) return;
    const { id, name, icon } = editing;
    return id === null
      ? run(() => createBadge({ name, icon }), 'Badge created.')
      : run(() => saveBadge(id, { name, icon }), `Badge ${id} has been successfully edited!`);
  }
</script>

<AdminHead heading="Badges" text="Shown on profiles. Give them to people from their edit page.">
  {#snippet extra()}
    <button
      class="btn btn-blue head-action"
      type="button"
      onclick={() => (editing = { id: null, name: '', icon: '' })}
    >
      <i class="fa-solid fa-plus"></i>New badge
    </button>
  {/snippet}
</AdminHead>

<div class="badge-grid">
  {#if list.state.status === 'ready'}
    {#each list.state.data as badge (badge.id)}
      {@const look = badgeIcon(badge.icon)}
      <div class="panel badge-card {look.colour}">
        <span class="badge-icon"><i class={look.icon}></i></span>
        <div>
          <b>{badge.name}</b>
          <span class="badge-meta">#{badge.id} · <code>{badge.icon}</code></span>
        </div>
        <button
          class="btn btn-small"
          type="button"
          onclick={() => (editing = { id: badge.id, name: badge.name, icon: badge.icon })}
        >
          <i class="fa-solid fa-pen"></i>Edit
        </button>
        <button
          class="icon-btn"
          type="button"
          aria-label="Delete {badge.name}"
          onclick={() => (deleting = badge)}
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    {/each}
  {:else if list.state.status === 'loading'}
    {#each [0, 1, 2, 3, 4, 5] as n (n)}
      <div class="panel"><span class="skel" style="width: 100%; height: 64px"></span></div>
    {/each}
  {:else}
    <p class="panel empty-note">{describe(list.state.error)}</p>
  {/if}
</div>

<AdminDialog
  bind:open={
    () => editing !== null,
    (value) => {
      if (!value) editing = null;
    }
  }
  title={editing?.id === null ? 'New badge' : 'Badge'}
  colour="c-yellow"
>
  {#if editing}
    <div class="field">
      <label for="badge-name">Name</label>
      <input id="badge-name" bind:value={editing.name} />
    </div>
    <div class="field">
      <label for="badge-icon">Icon</label>
      <input id="badge-icon" placeholder="yellow fa-heart" bind:value={editing.icon} />
      <small>
        A Font Awesome icon, with a colour in front if you want one: teal, yellow, blue, red or
        purple.
      </small>
    </div>
    {#if preview}
      <div class="badge-card {preview.colour}">
        <span class="badge-icon"><i class={preview.icon}></i></span>
        <div><b>{editing.name || 'Badge'}</b></div>
      </div>
    {/if}
  {/if}
  {#snippet footer()}
    <button class="btn" onclick={() => (editing = null)}>Cancel</button>
    <button class="btn btn-blue" disabled={busy || !editing?.name.trim()} onclick={save}>
      Save badge
    </button>
  {/snippet}
</AdminDialog>

<AdminDialog
  bind:open={
    () => deleting !== null,
    (value) => {
      if (!value) deleting = null;
    }
  }
  title="Delete this badge?"
  colour="c-red"
>
  <p><b>{deleting?.name}</b> is removed from everyone who has it.</p>
  {#snippet footer()}
    <button class="btn" onclick={() => (deleting = null)}>Cancel</button>
    <button
      class="btn btn-red"
      disabled={busy}
      onclick={() => deleting && run(() => deleteBadge(deleting!.id), 'Badge deleted.')}
    >
      Delete badge
    </button>
  {/snippet}
</AdminDialog>
