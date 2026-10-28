<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { consoleLogs } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import AdminTag from '$lib/components/admin/AdminTag.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const logs = query((signal) => consoleLogs(current, signal));

  const stamp = (unix: number) =>
    new Date(unix * 1000).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
</script>

<AdminHead
  heading="Console"
  text="Errors and warnings the site hit, with who was using it at the time."
/>

{#if logs.state.status === 'ready'}
  <div class="game-cards">
    {#each logs.state.data.rows as row, i (`${row.time}-${i}`)}
      {@const error = row.level === 'error'}
      <details
        class="game-card trace {error ? 'c-red' : 'c-yellow'}"
        open={i === 0 && current === 1}
      >
        <summary>
          <AdminTag colour={error ? 'c-red' : 'c-yellow'}>
            <i class="fa-solid {error ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
            {error ? 'Error' : 'Warning'}
          </AdminTag>
          <code class="first-line">{row.message}</code>
          <span class="go">
            {#if row.userId !== null}
              <a class="by" href="/admin/users/{row.userId}"
                ><Avatar id={row.userId} />{row.username}</a
              >
            {:else}
              <span class="faint">No one logged in</span>
            {/if}
            <time>{stamp(row.time)}</time>
            <i class="fa-solid fa-chevron-down"></i>
          </span>
        </summary>
        <pre>{row.stack}</pre>
      </details>
    {:else}
      <div class="empty-state">
        <i class="fa-solid fa-circle-check"></i>
        <b>Nothing has gone wrong</b>
      </div>
    {/each}
  </div>
  {#if logs.state.data.pages > 1}
    <Pager
      page={current}
      pages={logs.state.data.pages}
      hasNext={current < logs.state.data.pages}
      onpage={(p) => goto(`/admin/console${p > 1 ? `?p=${p}` : ''}`)}
    />
  {/if}
{:else if logs.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 120px"></span>
{:else}
  <p class="panel empty-note">Couldn't load the console.</p>
{/if}
