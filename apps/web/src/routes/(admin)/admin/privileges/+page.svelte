<script lang="ts">
  import { createGroup, deleteGroup, privilegeGroups, saveGroup } from '$lib/api/admin';
  import type { PrivilegeGroup } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { permissions } from '$lib/admin';
  import AdminDialog from '$lib/components/admin/AdminDialog.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import AdminTag from '$lib/components/admin/AdminTag.svelte';
  import { flash } from '$lib/flash.svelte';

  let version = $state(0);
  const list = query((signal) => {
    void version;
    return privilegeGroups(signal);
  });

  let editing = $state<{
    id: number | null;
    name: string;
    colour: string;
    privileges: number;
  } | null>(null);
  let deleting = $state<PrivilegeGroup | null>(null);
  let busy = $state(false);

  const granted = (value: number) => permissions.filter(([bit]) => (value & bit) === bit).length;

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
    const { id, name, colour, privileges } = editing;
    return id === null
      ? run(() => createGroup({ name, colour, privileges }), 'Privilege group created.')
      : run(
          () => saveGroup(id, { name, colour, privileges }),
          `Privilege ${name} has been successfully edited!`
        );
  }

  function toggle(bit: number) {
    if (!editing) return;
    editing.privileges =
      editing.privileges & bit ? editing.privileges & ~bit : editing.privileges | bit;
  }

  // The stored names come from RealistikPanel; each shows as the site colour next to it.
  const colours = [
    ['', 'Grey', 'c-grey'],
    ['danger', 'Red', 'c-red'],
    ['warning', 'Yellow', 'c-yellow'],
    ['success', 'Green', 'c-green'],
    ['info', 'Blue', 'c-blue'],
    ['primary', 'Purple', 'c-purple']
  ];
</script>

<AdminHead heading="Privileges" text="Groups of permissions you can put users in.">
  {#snippet extra()}
    <button
      class="act go c-blue"
      type="button"
      onclick={() => (editing = { id: null, name: '', colour: '', privileges: 3 })}
    >
      <i class="fa-solid fa-plus"></i>New group
    </button>
  {/snippet}
</AdminHead>

<div class="table-wrap">
  <table class="board admin-table c-red">
    <thead>
      <tr>
        <th>ID</th>
        <th>Group</th>
        <th>Value</th>
        <th>Grants</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if list.state.status === 'ready'}
        {#each list.state.data as group (group.id)}
          <tr>
            <td class="dim">{group.id}</td>
            <td><AdminTag colour={group.tone}>{group.name}</AdminTag></td>
            <td><code class="value-code">{group.privileges}</code></td>
            <td class="dim">
              {granted(group.privileges)}
              {granted(group.privileges) === 1 ? 'permission' : 'permissions'}
            </td>
            <td class="actions">
              <button
                class="btn btn-small"
                type="button"
                onclick={() =>
                  (editing = {
                    id: group.id,
                    name: group.name,
                    colour: group.colour,
                    privileges: group.privileges
                  })}
              >
                <i class="fa-solid fa-pen"></i>Edit
              </button>
              <button
                class="btn btn-small"
                type="button"
                aria-label="Delete {group.name}"
                onclick={() => (deleting = group)}
              >
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </td>
          </tr>
        {/each}
      {:else if list.state.status === 'loading'}
        {#each [0, 1, 2, 3, 4, 5] as n (n)}
          <tr><td colspan="5"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="5" class="empty-note">{describe(list.state.error)}</td></tr>
      {/if}
    </tbody>
  </table>
</div>

<AdminDialog
  bind:open={
    () => editing !== null,
    (value) => {
      if (!value) editing = null;
    }
  }
  title={editing?.id === null ? 'New privilege group' : 'Privilege group'}
  colour="c-red"
  size="wide"
>
  {#if editing}
    <div class="field-pair">
      <div class="field">
        <label for="priv-name">Name</label>
        <input id="priv-name" bind:value={editing.name} />
      </div>
      <div class="field">
        <label for="priv-colour">Colour</label>
        <div class="swatches" id="priv-colour" role="radiogroup" aria-label="Colour">
          {#each colours as [value, label, tone] (value)}
            <label class={tone} title={label}>
              <input type="radio" name="priv-colour" {value} bind:group={editing.colour} />
              <span></span>
            </label>
          {/each}
        </div>
      </div>
    </div>
    <div class="field">
      <label for="priv-value">Value</label>
      <input id="priv-value" type="number" min="0" bind:value={editing.privileges} />
      <small>Tick what the group can do below, or type the number in.</small>
    </div>
    <div class="perm-grid">
      {#each permissions as [bit, label] (bit)}
        <label class="perm" title="Bit {bit}">
          <input
            type="checkbox"
            checked={(editing.privileges & bit) === bit}
            onchange={() => toggle(bit)}
          />
          <span>{label}</span>
        </label>
      {/each}
    </div>
  {/if}
  {#snippet footer()}
    <button class="btn" onclick={() => (editing = null)}>Cancel</button>
    <button class="btn btn-blue" disabled={busy || !editing?.name.trim()} onclick={save}>
      Save group
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
  title="Delete this group?"
  colour="c-red"
>
  <p>
    <b>{deleting?.name}</b> is deleted. Users in it keep their current permissions until you move them.
  </p>
  {#snippet footer()}
    <button class="btn" onclick={() => (deleting = null)}>Cancel</button>
    <button
      class="btn btn-red"
      disabled={busy}
      onclick={() => deleting && run(() => deleteGroup(deleting!.id), 'Privilege group deleted.')}
    >
      Delete group
    </button>
  {/snippet}
</AdminDialog>
