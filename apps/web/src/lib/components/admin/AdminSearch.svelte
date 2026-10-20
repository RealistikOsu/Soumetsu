<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import type { AdminArea, Waiting } from '$lib/admin';
  import { adminUsers, ipUsers } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { recentUsers, type RecentUser } from './recent';

  let {
    open = $bindable(false),
    areas,
    waiting,
    canUsers,
    canIps
  }: {
    open?: boolean;
    areas: AdminArea[];
    waiting: Record<Waiting, number> | null;
    canUsers: boolean;
    canIps: boolean;
  } = $props();

  type Row =
    | {
        kind: 'page';
        href: string;
        label: string;
        icon: string;
        colour: string;
        area: string;
        count: number;
      }
    | { kind: 'user'; href: string; user: RecentUser; note?: string }
    | { kind: 'more'; href: string; label: string };

  let dialog = $state<HTMLDialogElement>();
  let input = $state<HTMLInputElement>();
  let term = $state('');
  let sel = $state(0);
  let recent = $state.raw<RecentUser[]>([]);

  const q = $derived(term.trim());
  const isIp = $derived(/^\d{1,3}(\.\d{1,3}){1,3}$/.test(q));

  const pages = $derived(
    areas.flatMap((area) => area.pages.map((p) => ({ ...p, colour: area.colour, area: area.name })))
  );

  // Typing fast shouldn't fire a search per key, so each one waits a moment and is dropped if another follows.
  const found = query(async (signal) => {
    const text = q;
    if (!open || !text || (!canUsers && !isIp) || (isIp && !canIps)) return null;
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (signal.aborted) return null;
    if (isIp) return { ip: await ipUsers(text, signal), users: [] };
    return { ip: null, users: (await adminUsers(1, text, signal)).users.slice(0, 6) };
  });

  const sections = $derived.by(() => {
    const out: { title: string; rows: Row[] }[] = [];
    const pageRow = (p: (typeof pages)[number]): Row => ({
      kind: 'page',
      ...p,
      count: p.waiting ? (waiting?.[p.waiting] ?? 0) : 0
    });
    if (!q) {
      const due = pages.filter((p) => p.waiting && waiting?.[p.waiting]);
      if (due.length) out.push({ title: 'Waiting', rows: due.map(pageRow) });
      if (recent.length) {
        out.push({
          title: 'Recently opened',
          rows: recent.map((user) => ({ kind: 'user', href: `/admin/users/${user.id}`, user }))
        });
      }
      return out;
    }
    const data = found.state.status === 'ready' ? found.state.data : null;
    if (data?.ip) {
      out.push({
        title: `Accounts on ${q}`,
        rows: data.ip.map((row) => ({
          kind: 'user',
          href: `/admin/users/${row.userid}`,
          user: { id: row.userid, username: row.username, group: { name: '', colour: '' } },
          note: `${row.occurencies} ${row.occurencies === 1 ? 'login' : 'logins'}`
        }))
      });
      return out;
    }
    if (data?.users.length) {
      out.push({
        title: 'Users',
        rows: data.users.map((user) => ({ kind: 'user', href: `/admin/users/${user.id}`, user }))
      });
    }
    const lower = q.toLowerCase();
    const hits = pages
      .filter((p) => `${p.label} ${p.keywords}`.toLowerCase().includes(lower))
      .slice(0, 4);
    if (hits.length) out.push({ title: 'Pages', rows: hits.map(pageRow) });
    if (canUsers) {
      out.push({
        title: 'More',
        rows: [
          {
            kind: 'more',
            href: `/admin/users?user=${encodeURIComponent(q)}`,
            label: `Search every user for "${q}"`
          }
        ]
      });
    }
    return out;
  });

  const rows = $derived(sections.flatMap((s) => s.rows));
  const searching = $derived(found.state.status === 'loading' && !!q && (canUsers || isIp));

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      term = '';
      sel = 0;
      recent = recentUsers();
      dialog.showModal();
      input?.focus();
    }
    if (!open && dialog.open) dialog.close();
  });

  function pick(row: Row | undefined) {
    if (!row) return;
    open = false;
    goto(row.href);
  }

  async function keydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') sel = Math.min(sel + 1, rows.length - 1);
    else if (event.key === 'ArrowUp') sel = Math.max(sel - 1, 0);
    else if (event.key === 'Enter') pick(rows[sel]);
    else return;
    event.preventDefault();
    await tick();
    dialog?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }
</script>

<dialog
  bind:this={dialog}
  class="admin-palette"
  aria-label="Search"
  onclose={() => (open = false)}
  onclick={(event) => {
    if (event.target === dialog) open = false;
  }}
>
  <div class="palette-find">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input
      bind:this={input}
      bind:value={term}
      type="search"
      placeholder={canUsers ? 'Name, ID, email, Discord ID, IP or a page' : 'Search pages'}
      aria-label="Search"
      autocomplete="off"
      oninput={() => (sel = 0)}
      onkeydown={keydown}
    />
    <button type="button" onclick={() => (open = false)}>Esc</button>
  </div>
  <div class="palette-results">
    {#each sections as section (section.title)}
      <h3>{section.title}</h3>
      {#each section.rows as row (row.href)}
        {@const index = rows.indexOf(row)}
        <a
          class={row.kind === 'page' ? row.colour : row.kind === 'more' ? 'c-green' : ''}
          class:sel={index === sel}
          href={row.href}
          onclick={(event) => {
            event.preventDefault();
            pick(row);
          }}
          onpointermove={() => (sel = index)}
        >
          {#if row.kind === 'page'}
            <i class="fa-solid {row.icon}"></i>{row.label}<span class="area">{row.area}</span>
            {#if row.count}<span class="count">{row.count}</span>{/if}
          {:else if row.kind === 'user'}
            <Avatar id={row.user.id} />
            <span class="who">{row.user.username}<small>#{row.user.id}</small></span>
            {#if row.note}
              <span class="area">{row.note}</span>
            {:else if row.user.group.name}
              <span class="tag {row.user.group.colour}">{row.user.group.name}</span>
            {/if}
          {:else}
            <i class="fa-solid fa-magnifying-glass"></i>{row.label}
          {/if}
          <i class="fa-solid fa-arrow-turn-down fa-rotate-90 go"></i>
        </a>
      {/each}
    {:else}
      {#if searching}
        <p class="palette-empty">Searching…</p>
      {:else if q}
        <p class="palette-empty">Nothing matches "{q}"</p>
      {:else}
        <p class="palette-empty">Nothing waiting. Type to search.</p>
      {/if}
    {/each}
  </div>
  <div class="palette-keys">
    <span><kbd>↑</kbd><kbd>↓</kbd>pick</span>
    <span><kbd>Enter</kbd>open</span>
    <span><kbd>Esc</kbd>close</span>
  </div>
</dialog>
