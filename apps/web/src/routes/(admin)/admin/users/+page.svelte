<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminUsers } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import AdminTag from '$lib/components/admin/AdminTag.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { fullDate, number, timeAgo } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const term = $derived(page.url.searchParams.get('user') ?? '');
  const users = query((signal) => adminUsers(current, term, signal));

  let search = $derived(term);

  function go(p: number, user = term) {
    const params = [user && `user=${encodeURIComponent(user)}`, p > 1 && `p=${p}`].filter(Boolean);
    goto(`/admin/users${params.length ? `?${params.join('&')}` : ''}`, { keepFocus: true });
  }
</script>

<AdminHead
  heading="Users"
  text={users.state.status === 'ready'
    ? `${number(users.state.data.total)} ${term ? 'matching accounts' : 'accounts'}. Search by username or email.`
    : 'Search by username or email.'}
/>

<form
  class="listing-search admin-search"
  onsubmit={(event) => {
    event.preventDefault();
    go(1, search.trim());
  }}
>
  <i class="fa-solid fa-magnifying-glass"></i>
  <input
    type="search"
    bind:value={search}
    placeholder="Username or email"
    aria-label="Search users"
  />
</form>

<div class="table-wrap">
  <table class="board admin-table c-green">
    <thead>
      <tr>
        <th>ID</th>
        <th class="player">Player</th>
        <th>Group</th>
        <th>Registered</th>
        <th>Last seen</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if users.state.status === 'ready'}
        {#each users.state.data.users as user (user.id)}
          <tr>
            <td class="dim">{user.id}</td>
            <td class="player">
              <div class="who-row">
                <a class="who" href="/users/{user.id}">
                  <Flag country={user.country} /><Avatar id={user.id} /><b>{user.username}</b>
                </a>
              </div>
            </td>
            <td><AdminTag colour={user.group.colour}>{user.group.name}</AdminTag></td>
            <td class="dim">{fullDate(user.registered)}</td>
            <td class="dim">{user.lastSeen ? timeAgo(user.lastSeen) : 'Never'}</td>
            <td class="actions">
              <a class="btn btn-small" href="/admin/users/{user.id}">
                <i class="fa-solid fa-pen-to-square"></i>Edit
              </a>
            </td>
          </tr>
        {:else}
          <tr><td colspan="6" class="empty-note">No users found.</td></tr>
        {/each}
      {:else if users.state.status === 'loading'}
        {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as n (n)}
          <tr><td colspan="6"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="6" class="empty-note">Couldn't load users.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

{#if users.state.status === 'ready' && users.state.data.pages > 1}
  <Pager
    page={current}
    pages={users.state.data.pages}
    hasNext={current < users.state.data.pages}
    onpage={(p) => go(p)}
  />
{/if}
