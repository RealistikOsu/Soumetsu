<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminClans } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import ClanBadge from '$lib/components/ClanBadge.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { number } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const term = $derived(page.url.searchParams.get('clan') ?? '');
  const list = query((signal) => adminClans(current, term, signal));

  let search = $derived(term);

  function go(p: number, clan = term) {
    const params = [clan && `clan=${encodeURIComponent(clan)}`, p > 1 && `p=${p}`].filter(Boolean);
    goto(`/admin/clans${params.length ? `?${params.join('&')}` : ''}`, { keepFocus: true });
  }
</script>

<AdminHead
  heading="Clans"
  text={list.state.status === 'ready'
    ? `${number(list.state.data.total)} ${term ? 'matching clans' : 'clans'}. Search by name or tag.`
    : 'Search by name or tag.'}
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
    placeholder="Clan name or tag"
    aria-label="Search clans"
  />
</form>

<div class="table-wrap">
  <table class="board admin-table c-purple">
    <thead>
      <tr>
        <th>ID</th>
        <th class="player">Clan</th>
        <th>Tag</th>
        <th>Description</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if list.state.status === 'ready'}
        {#each list.state.data.clans as clan (clan.id)}
          <tr>
            <td class="dim">{clan.id}</td>
            <td class="player">
              <a class="who" href="/admin/clans/{clan.id}">
                <ClanBadge id={clan.id} tag={clan.tag} size="small" /><b>{clan.name}</b>
              </a>
            </td>
            <td><span class="clan-tag">[{clan.tag}]</span></td>
            <td class="note">{clan.description}</td>
            <td class="actions">
              <a class="btn btn-small" href="/admin/clans/{clan.id}">
                <i class="fa-solid fa-pen-to-square"></i>Edit
              </a>
            </td>
          </tr>
        {:else}
          <tr><td colspan="5" class="empty-note">No clans found.</td></tr>
        {/each}
      {:else if list.state.status === 'loading'}
        {#each [0, 1, 2, 3, 4, 5, 6, 7] as n (n)}
          <tr><td colspan="5"><span class="skel" style="width: 100%; height: 22px"></span></td></tr>
        {/each}
      {:else}
        <tr><td colspan="5" class="empty-note">Couldn't load clans.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

{#if list.state.status === 'ready' && list.state.data.pages > 1}
  <Pager
    page={current}
    pages={list.state.data.pages}
    hasNext={current < list.state.data.pages}
    onpage={(p) => go(p)}
  />
{/if}
