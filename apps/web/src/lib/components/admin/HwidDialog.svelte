<script lang="ts">
  import { hwidLogs } from '$lib/api/admin';
  import type { HwidRow } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { number } from '$lib/format';
  import Avatar from '../Avatar.svelte';
  import Pager from '../Pager.svelte';
  import AdminDialog from './AdminDialog.svelte';
  import Hash from './Hash.svelte';

  let { open = $bindable(false), userId }: { open: boolean; userId: number } = $props();

  let page = $state(1);
  let data = $state<{ total: number; pages: number; rows: HwidRow[] } | null>(null);
  let failure = $state('');
  let onlyMatches = $state(false);
  let expanded = $state<number[]>([]);

  $effect(() => {
    if (!open) return;
    const wanted = page;
    data = null;
    failure = '';
    expanded = [];
    hwidLogs(userId, wanted).then(
      (found) => (data = found),
      (error) => (failure = describe(error))
    );
  });

  $effect(() => {
    if (!open) page = 1;
  });

  const rows = $derived((data?.rows ?? []).filter((row) => !onlyMatches || row.matches.length > 0));
  const exact = $derived(
    new Set(
      (data?.rows ?? []).flatMap((row) => row.matches.filter((m) => m.exact).map((m) => m.userId))
    ).size
  );
  const partial = $derived(
    new Set((data?.rows ?? []).flatMap((row) => row.matches.map((m) => m.userId))).size
  );

  const toggle = (id: number) => {
    expanded = expanded.includes(id) ? expanded.filter((e) => e !== id) : [...expanded, id];
  };
  const hit = (row: HwidRow, part: number) => row.matches.some((m) => m.hits[part]);
</script>

<AdminDialog bind:open title="HWID history" colour="c-teal" size="wide hwid">
  {#if failure}
    <p>{failure}</p>
  {:else if !data}
    <span class="skel" style="width: 100%; height: 120px"></span>
  {:else}
    <div class="hwid-summary">
      <span><b>{number(data.total)}</b> logs</span>
      <span><b>{exact}</b> exact {exact === 1 ? 'match' : 'matches'}</span>
      <span class:warn={partial > 0}>
        <b>{partial}</b>
        {partial === 1 ? 'account' : 'accounts'}
        {exact === partial ? 'match' : 'partly match'}
      </span>
      <label class="check"
        ><input type="checkbox" bind:checked={onlyMatches} />Only logs matching other accounts</label
      >
    </div>
    <div class="hwid-table">
      <table class="board admin-table">
        <thead>
          <tr>
            <th>Log</th>
            <th>Seen</th>
            <th>MAC</th>
            <th>Unique ID</th>
            <th>Disk</th>
            <th>Matches</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr class:has-match={row.matches.length > 0}>
              <td class="dim">#{row.id}</td>
              <td class="dim">{row.seen}×</td>
              <td><Hash value={row.mac} empty={row.empty[0]} hit={hit(row, 0)} /></td>
              <td><Hash value={row.uniqueId} empty={row.empty[1]} hit={hit(row, 1)} /></td>
              <td><Hash value={row.diskId} empty={row.empty[2]} hit={hit(row, 2)} /></td>
              <td>
                {#if row.matches.length}
                  <button
                    class="match-toggle"
                    aria-expanded={expanded.includes(row.id)}
                    aria-controls="matches-{row.id}"
                    onclick={() => toggle(row.id)}
                  >
                    {row.matches[0].username}{row.matches.length > 1
                      ? ` and ${row.matches.length - 1} more`
                      : ''}<i class="fa-solid fa-chevron-down"></i>
                  </button>
                {:else}
                  <span class="faint">None</span>
                {/if}
              </td>
            </tr>
            {#if row.matches.length}
              <tr class="match-detail" class:open={expanded.includes(row.id)} id="matches-{row.id}">
                <td colspan="6">
                  <div class="match-wrap">
                    <div>
                      <table>
                        <thead>
                          <tr>
                            <th>Account</th>
                            <th>Their log</th>
                            <th>MAC</th>
                            <th>Unique ID</th>
                            <th>Disk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {#each row.matches as match (match.logId)}
                            <tr>
                              <td class="player">
                                <a class="who" href="/admin/users/{match.userId}">
                                  <Avatar id={match.userId} /><b>{match.username}</b>
                                  <span class="muted">#{match.userId}</span>
                                </a>
                              </td>
                              <td class="dim">#{match.logId}</td>
                              <td
                                ><Hash
                                  value={match.mac}
                                  hit={match.hits[0]}
                                  other={!match.hits[0]}
                                /></td
                              >
                              <td>
                                <Hash
                                  value={match.uniqueId}
                                  hit={match.hits[1]}
                                  other={!match.hits[1]}
                                />
                              </td>
                              <td
                                ><Hash
                                  value={match.diskId}
                                  hit={match.hits[2]}
                                  other={!match.hits[2]}
                                /></td
                              >
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {:else}
            <tr><td colspan="6" class="empty-note">No logs to show.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if data.pages > 1}
      <Pager {page} pages={data.pages} hasNext={page < data.pages} onpage={(p) => (page = p)} />
    {/if}
    <p class="faint">
      Hover a hash to see all of it, click to copy. Exact matches share all three parts, partial
      ones at least one, so those can be false positives. Empty parts never count.
    </p>
  {/if}
  {#snippet footer()}
    <button class="btn" onclick={() => (open = false)}>Close</button>
  {/snippet}
</AdminDialog>
