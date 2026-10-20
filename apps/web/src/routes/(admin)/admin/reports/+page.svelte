<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { playerReports, resolvePlayerReport } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { flash } from '$lib/flash.svelte';
  import { dateTime, timeAgo } from '$lib/format';

  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const all = $derived(page.url.searchParams.get('all') === '1');
  let version = $state(0);
  const reports = query((signal) => {
    void version;
    return playerReports(all, current, signal);
  });

  async function resolve(id: number) {
    try {
      await resolvePlayerReport(id);
      flash.show('success', 'Report resolved.');
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  const colours: Record<string, string> = {
    Cheating: 'c-red',
    Multiaccounting: 'c-orange',
    'Inappropriate profile': 'c-pink',
    'Insulting people': 'c-purple',
    Spam: 'c-yellow'
  };

  // Website and !report reasons both read "Label - detail".
  function split(reason: string) {
    const at = reason.indexOf(' - ');
    return at < 0
      ? { label: reason, detail: '' }
      : { label: reason.slice(0, at), detail: reason.slice(at + 3) };
  }
</script>

<AdminHead
  heading="Player reports"
  text="From profiles and from !report in game, which also saves their recent chat."
>
  {#snippet extra()}
    <nav class="seg">
      <a class:active={!all} href="/admin/reports">Open</a>
      <a class:active={all} href="/admin/reports?all=1">All</a>
    </nav>
  {/snippet}
</AdminHead>

{#if reports.state.status === 'ready'}
  <div class="cases">
    {#each reports.state.data.rows as report (report.id)}
      {@const { label, detail } = split(report.reason)}
      <article class="case">
        <Avatar id={report.to_uid} />
        <div class="case-line">
          <a href="/admin/users/{report.to_uid}">{report.to_name ?? report.to_uid}</a>
          <span class="admin-tag {colours[label] ?? 'c-grey'}">{label}</span>
        </div>
        <div class="case-side">
          {#if report.resolved_at}
            <span class="faint">Resolved by {report.resolved_name ?? 'someone'}</span>
          {:else}
            <button class="act go c-green" type="button" onclick={() => resolve(report.id)}>
              <i class="fa-solid fa-check"></i>Resolve
            </button>
          {/if}
        </div>
        <p class="case-sub">
          Reported by
          <a class="by" href="/admin/users/{report.from_uid}"
            ><Avatar id={report.from_uid} />{report.from_name ?? report.from_uid}</a
          >
          · <time title={dateTime(report.time)}>{timeAgo(report.time)}</time>
          {#if detail}<br /><q>{detail}</q>{/if}
        </p>
        {#if report.chatlog}
          <details class="chat-log case-more">
            <summary>
              <i class="fa-solid fa-comments"></i>Their recent chat<i
                class="fa-solid fa-chevron-down"
              ></i>
            </summary>
            <pre>{report.chatlog}</pre>
          </details>
        {/if}
      </article>
    {:else}
      <div class="empty-state">
        <i class="fa-solid fa-circle-check"></i>
        <b>{all ? 'No reports yet' : 'Nothing to look at'}</b>
        {#if !all}<span>Every report has been handled.</span>{/if}
      </div>
    {/each}
  </div>
  {#if reports.state.data.pages > 1}
    <Pager
      page={current}
      pages={reports.state.data.pages}
      hasNext={current < reports.state.data.pages}
      onpage={(p) => goto(`/admin/reports?${all ? 'all=1&' : ''}p=${p}`)}
    />
  {/if}
{:else if reports.state.status === 'loading'}
  <div class="cases">
    {#each [0, 1, 2] as n (n)}
      <span class="skel" style="width: 100%; height: 76px"></span>
    {/each}
  </div>
{:else}
  <p class="panel empty-note">Couldn't load the reports.</p>
{/if}
