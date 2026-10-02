<script lang="ts">
  import type { AdminUserDetail } from '$lib/api/admin';
  import { Privilege } from '$lib/auth/privileges';
  import { fullDate } from '$lib/format';
  import AdminDialog from './AdminDialog.svelte';
  import ScopeFields from './ScopeFields.svelte';

  type Body = { action: string } & Record<string, unknown>;

  let {
    user,
    open = $bindable(null),
    run
  }: {
    user: AdminUserDetail['user'];
    open: string | null;
    run: (body: Body, success: string) => Promise<boolean>;
  } = $props();

  const shown = (key: string) => ({
    get: () => open === key,
    set: (value: boolean) => {
      if (!value && open === key) open = null;
    }
  });

  const confirms = $derived([
    [
      'wipe-profile-comments',
      'Wipe comments on their profile?',
      `Every comment left on ${user.username}'s profile is deleted.`,
      'Wipe comments',
      'Comments wiped.'
    ],
    [
      'wipe-their-comments',
      'Wipe comments they wrote?',
      `Every comment ${user.username} has left on other profiles is deleted.`,
      'Wipe comments',
      'Comments wiped.'
    ],
    [
      'reset-avatar',
      'Reset avatar?',
      `${user.username} gets the default avatar back.`,
      'Reset avatar',
      'Avatar reset.'
    ],
    [
      'clear-hwid',
      'Clear HWID matches?',
      `${user.username}'s hardware logs stop counting as matches with other accounts.`,
      'Clear matches',
      'HWID matches cleared.'
    ],
    [
      'kick-clan',
      'Kick from their clan?',
      user.clan
        ? `${user.username} is removed from ${user.clan.name} [${user.clan.tag}].`
        : `${user.username} is not in a clan.`,
      'Kick',
      'Removed from their clan.'
    ]
  ]);

  let username = $state('');
  let keepHistory = $state(true);
  let password = $state('');
  let days = $state(30);
  let rollbackDays = $state(1);
  let modes = $state([0, 1, 2, 3]);
  let types = $state(['va', 'rx', 'ap']);
  let confirm = $state('');
  let busy = $state(false);

  $effect(() => {
    if (!open) return;
    username = '';
    keepHistory = true;
    password = '';
    days = 30;
    rollbackDays = 1;
    modes = [0, 1, 2, 3];
    types = ['va', 'rx', 'ap'];
    confirm = '';
  });

  async function submit(body: Body, success: string) {
    busy = true;
    const done = await run(body, success);
    busy = false;
    if (done) open = null;
  }

  const supporter = $derived(!!(user.privileges & Privilege.Donor));
  const supporterUntil = $derived(
    supporter && user.donorExpire ? fullDate(user.donorExpire) : null
  );
</script>

<AdminDialog bind:open={shown('rename').get, shown('rename').set} title="Rename {user.username}">
  <div class="field">
    <label for="new-name">New username</label>
    <input id="new-name" bind:value={username} placeholder={user.username} />
  </div>
  <label class="check">
    <input
      type="checkbox"
      checked={!keepHistory}
      onchange={(event) => (keepHistory = !event.currentTarget.checked)}
    />
    Don't add the old name to their history
  </label>
  {#snippet footer()}
    <button class="btn" onclick={() => (open = null)}>Cancel</button>
    <button
      class="btn btn-blue"
      disabled={busy || !username.trim()}
      onclick={() => submit({ action: 'rename', username, keepHistory }, 'Username changed.')}
    >
      Rename
    </button>
  {/snippet}
</AdminDialog>

<AdminDialog
  bind:open={shown('password').get, shown('password').set}
  title="Change password"
  colour="c-orange"
>
  <div class="field">
    <label for="new-pass">New password</label>
    <input id="new-pass" type="password" autocomplete="new-password" bind:value={password} />
    <small>At least 8 characters.</small>
  </div>
  {#snippet footer()}
    <button class="btn" onclick={() => (open = null)}>Cancel</button>
    <button
      class="btn btn-blue"
      disabled={busy || password.length < 8}
      onclick={() => submit({ action: 'password', password }, 'Password changed.')}
    >
      Change password
    </button>
  {/snippet}
</AdminDialog>

<AdminDialog
  bind:open={shown('supporter').get, shown('supporter').set}
  title="Supporter"
  colour="c-yellow"
>
  <p>
    {#if supporterUntil}Supporter until <b>{supporterUntil}</b>.{:else}Not a supporter.{/if}
  </p>
  <div class="field">
    <label for="days">Add days</label>
    <input id="days" type="number" min="1" bind:value={days} />
  </div>
  {#snippet footer()}
    <button class="btn" onclick={() => (open = null)}>Cancel</button>
    {#if supporter}
      <button
        class="btn btn-red"
        disabled={busy}
        onclick={() => submit({ action: 'remove-supporter' }, 'Supporter removed.')}
      >
        Remove supporter
      </button>
    {/if}
    <button
      class="btn btn-blue"
      disabled={busy || !(days > 0)}
      onclick={() => submit({ action: 'supporter', days }, `Awarded ${days} days of supporter.`)}
    >
      Add days
    </button>
  {/snippet}
</AdminDialog>

<AdminDialog
  bind:open={shown('rollback').get, shown('rollback').set}
  title="Roll back scores"
  colour="c-red"
>
  <div class="field">
    <label for="rollback-days">Days</label>
    <input id="rollback-days" type="number" min="1" bind:value={rollbackDays} />
    <small>Scores set in this many days are deleted.</small>
  </div>
  <ScopeFields bind:modes bind:types />
  {#snippet footer()}
    <button class="btn" onclick={() => (open = null)}>Cancel</button>
    <button
      class="btn btn-red"
      disabled={busy || !(rollbackDays > 0) || !modes.length || !types.length}
      onclick={() =>
        submit({ action: 'rollback', days: rollbackDays, modes, types }, 'Scores rolled back.')}
    >
      Roll back
    </button>
  {/snippet}
</AdminDialog>

<AdminDialog bind:open={shown('wipe').get, shown('wipe').set} title="Wipe account" colour="c-red">
  <p>Removes every score and resets the stats for what you pick. This cannot be undone.</p>
  <ScopeFields bind:modes bind:types />
  {#snippet footer()}
    <button class="btn" onclick={() => (open = null)}>Cancel</button>
    <button
      class="btn btn-red"
      disabled={busy || !modes.length || !types.length}
      onclick={() => submit({ action: 'wipe', modes, types }, 'Account wiped.')}
    >
      Wipe
    </button>
  {/snippet}
</AdminDialog>

{#each confirms as [action, title, text, label, success] (action)}
  <AdminDialog bind:open={shown(action).get, shown(action).set} {title} colour="c-red">
    <p>{text}</p>
    {#snippet footer()}
      <button class="btn" onclick={() => (open = null)}>Cancel</button>
      <button
        class="btn btn-red"
        disabled={busy || (action === 'kick-clan' && !user.clan)}
        onclick={() => submit({ action }, success)}
      >
        {label}
      </button>
    {/snippet}
  </AdminDialog>
{/each}

<AdminDialog
  bind:open={shown('delete').get, shown('delete').set}
  title="Delete account?"
  colour="c-red"
>
  <p>
    Deletes {user.username} and everything tied to the account: scores, stats, comments and clan membership.
    This cannot be undone.
  </p>
  <div class="field">
    <label for="confirm-name">Type <b>{user.username}</b> to confirm</label>
    <input id="confirm-name" autocomplete="off" bind:value={confirm} />
  </div>
  {#snippet footer()}
    <button class="btn" onclick={() => (open = null)}>Cancel</button>
    <button
      class="btn btn-red"
      disabled={busy || confirm !== user.username}
      onclick={() => submit({ action: 'delete', confirm }, 'Account deleted.')}
    >
      Delete account
    </button>
  {/snippet}
</AdminDialog>
