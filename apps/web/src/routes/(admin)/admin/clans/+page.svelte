<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminClans } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
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
    ? `${number(list.state.data.total)} ${term ? 'matching clans' : 'clans'}.`
    : 'Search by name or tag.'}
>
  {#snippet extra()}
    <form
      class="find-box"
      onsubmit={(event) => {
        event.preventDefault();
        go(1, search.trim());
      }}
    >
      <i class="fa-solid fa-magnifying-glass"></i>
      <input
        type="search"
        bind:value={search}
        placeholder="Name or tag"
        aria-label="Search clans"
      />
    </form>
  {/snippet}
</AdminHead>

{#if list.state.status === 'ready'}
  <div class="cases">
    {#each list.state.data.clans as clan (clan.id)}
      <article class="case">
        <ClanBadge id={clan.id} tag={clan.tag} size="small" />
        <div class="case-line">
          <span class="admin-tag c-purple">{clan.tag}</span>
          <a href="/admin/clans/{clan.id}">{clan.name}</a>
          <span class="faint">#{clan.id}</span>
        </div>
        <div class="case-side"><a class="act" href="/admin/clans/{clan.id}">Manage</a></div>
        <p class="case-sub">
          {#if clan.description}{clan.description} ·{/if}
          {#if clan.owner}
            owned by
            <a class="by" href="/admin/users/{clan.owner.id}"
              ><Avatar id={clan.owner.id} />{clan.owner.username}</a
            > ·
          {/if}
          {clan.members}
          {clan.members === 1 ? 'member' : 'members'}
        </p>
      </article>
    {:else}
      <p class="panel empty-note">No clans found.</p>
    {/each}
  </div>
  {#if list.state.data.pages > 1}
    <Pager
      page={current}
      pages={list.state.data.pages}
      hasNext={current < list.state.data.pages}
      onpage={(p) => go(p)}
    />
  {/if}
{:else if list.state.status === 'loading'}
  <div class="cases">
    {#each [0, 1, 2, 3] as n (n)}
      <span class="skel" style="width: 100%; height: 72px"></span>
    {/each}
  </div>
{:else}
  <p class="panel empty-note">Couldn't load clans.</p>
{/if}
