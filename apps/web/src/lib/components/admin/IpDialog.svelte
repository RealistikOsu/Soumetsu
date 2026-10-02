<script lang="ts">
  import { ipUsers, userIps } from '$lib/api/admin';
  import type { IpRow } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import Avatar from '../Avatar.svelte';
  import AdminDialog from './AdminDialog.svelte';

  let {
    open = $bindable(false),
    title,
    userId,
    ip = null
  }: {
    open: boolean;
    title: string;
    userId: number;
    ip?: string | null;
  } = $props();

  let rows = $state<IpRow[] | null>(null);
  let failure = $state('');

  $effect(() => {
    if (!open) return;
    rows = null;
    failure = '';
    (ip ? ipUsers(ip) : userIps(userId)).then(
      (found) => (rows = found),
      (error) => (failure = describe(error))
    );
  });
</script>

<AdminDialog bind:open {title} size="wide">
  {#if failure}
    <p>{failure}</p>
  {:else if !rows}
    <span class="skel" style="width: 100%; height: 80px"></span>
  {:else}
    <table class="board admin-table">
      <thead>
        <tr><th>IP</th><th class="player">User</th><th>Seen</th></tr>
      </thead>
      <tbody>
        {#each rows as row (`${row.ip}-${row.userid}`)}
          <tr>
            <td>{row.ip}</td>
            <td class="player">
              <a class="who" href="/admin/users/{row.userid}">
                <Avatar id={row.userid} /><b>{row.username}</b>
              </a>
            </td>
            <td class="dim">{row.occurencies}×</td>
          </tr>
        {:else}
          <tr><td colspan="3" class="empty-note">Nothing found.</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}
  {#snippet footer()}
    <button class="btn" onclick={() => (open = false)}>Close</button>
  {/snippet}
</AdminDialog>
