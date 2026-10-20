<script lang="ts">
  import { CountUp } from '@soumetsu/ui';
  import { getAdminNav } from '$lib/admin';
  import { dashboard, serviceStatus } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import { onlineHistory } from '$lib/api/v1';
  import { session } from '$lib/auth/session.svelte';
  import PlayTable from '$lib/components/admin/PlayTable.svelte';
  import Sparkline from '$lib/components/admin/Sparkline.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { timeAgo } from '$lib/format';

  const nav = getAdminNav();
  const data = query((signal) => dashboard(signal));
  const status = query((signal) => serviceStatus(signal));
  const history = query((signal) => onlineHistory(signal));

  const services = $derived<[string, boolean | null][]>([
    ['Score service', status.state.status === 'ready' ? status.state.data.scores : null],
    ['Bancho', status.state.status === 'ready' ? status.state.data.bancho : null],
    ['API', status.state.status === 'ready' ? status.state.data.api : null]
  ]);

  const counters = [
    ['c-blue', 'fa-users', 'registered', 'Registered'],
    ['c-teal', 'fa-play', 'plays', 'Total plays'],
    ['c-purple', 'fa-file-lines', 'scores', 'Scores'],
    ['c-yellow', 'fa-trophy', 'totalPp', 'Total pp']
  ] as const;

  const waiting = $derived.by(() => {
    if (!nav.waiting) return '';
    const due = (
      [
        [nav.waiting.reports, 'report', 'reports'],
        [nav.waiting.messageReports, 'message report', 'message reports'],
        [nav.waiting.requests, 'rank request', 'rank requests']
      ] as const
    ).filter(([count]) => count);
    if (!due.length) return 'Nothing is waiting.';
    const parts = due.map(([count, one, many]) => `${count} ${count === 1 ? one : many}`);
    const list =
      parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
    return `${list} ${due.length === 1 && due[0][0] === 1 ? 'is' : 'are'} waiting.`;
  });
</script>

<!-- The dashboard opens on the panel's banner, like a player's page opens on theirs. -->
<section class="dash-hero" style="background-image: url(/img/admin/banner.jpg)">
  <div>
    <h1>Hi {session.user?.username}</h1>
    <p>{waiting}</p>
  </div>
  <div class="dash-services">
    {#each services as [name, up] (name)}
      <span class:down={up === false} class:up><i class="fa-solid fa-circle"></i>{name}</span>
    {/each}
  </div>
</section>

<section class="dash-stats">
  <div class="dash-online">
    {#if history.state.status === 'ready' && history.state.data.length > 1}
      {@const values = history.state.data}
      <small>Online now</small>
      <b><CountUp value={values[values.length - 1]} /></b>
      <span class="faint">Peak of {Math.max(...values)} in the last 35 hours</span>
      <Sparkline {values} spanMinutes={2100} />
    {:else if history.state.status === 'error'}
      <p class="muted">Couldn't load the player count.</p>
    {:else}
      <span class="skel" style="width: 100%; height: 90px"></span>
    {/if}
  </div>
  <div class="dash-counters">
    {#each counters as [colour, icon, key, label] (key)}
      <div class={colour}>
        <i class="fa-solid {icon}"></i>
        <span>
          <small>{label}</small>
          <b>
            {#if data.state.status === 'ready'}
              <CountUp value={data.state.data.counters[key]} />
            {:else}
              <span class="skel" style="width: 70px"></span>
            {/if}
          </b>
        </span>
      </div>
    {/each}
  </div>
</section>

{#if data.state.status === 'error'}
  <p class="panel empty-note">Couldn't load the dashboard. Try again in a bit.</p>
{:else}
  <div class="dash-attention">
    {#if data.state.status === 'ready'}
      {@const d = data.state.data}
      <a class="c-pink" href="/admin/requests">
        <b>{d.pendingRequests.total}</b>
        <span>
          <em>Rank requests</em>
          {d.pendingRequests.oldest
            ? `Oldest sent ${timeAgo(d.pendingRequests.oldest)}`
            : 'The queue is empty'}
        </span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
      <a class="c-lblue" href="/admin/users">
        <b>{d.frozen.total}</b>
        <span>
          <em>Frozen players</em>
          {d.frozen.soonest ? `${d.frozen.soonest.username} was frozen first` : 'Nobody is frozen'}
        </span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
      <a class="c-red" href="/admin/ban-logs">
        <b>{d.restrictions.week}</b>
        <span>
          <em>Restrictions this week</em>
          {d.restrictions.latest
            ? `Latest: ${d.restrictions.latest.username}, ${timeAgo(d.restrictions.latest.ts)}`
            : 'None yet'}
        </span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    {:else}
      {#each [0, 1, 2] as n (n)}
        <span class="skel" style="width: 100%; height: 66px"></span>
      {/each}
    {/if}
  </div>

  <!-- every page in the panel, by area, so nothing needs a menu to be found -->
  <div class="launcher">
    {#each nav.areas as area (area.key)}
      <section class={area.colour}>
        <h2><i class="fa-solid {area.icon}"></i>{area.name}</h2>
        <div>
          {#each area.pages as item (item.href)}
            {@const count = item.waiting ? nav.waiting?.[item.waiting] : 0}
            <a href={item.href}>
              <i class="fa-solid {item.icon}"></i><span>{item.label}</span>
              {#if count}<small>{count}</small>{/if}
            </a>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <div class="user-split">
    <section class="user-box">
      <h2>Latest plays</h2>
      <PlayTable
        plays={data.state.status === 'ready' ? data.state.data.latest : []}
        loading={data.state.status === 'loading'}
      />
    </section>
    <aside class="user-box">
      <h2>Staff activity <a href="/admin/logs">All logs</a></h2>
      <ol class="feed">
        {#if data.state.status === 'ready'}
          {#each data.state.data.activity as entry (entry.id)}
            <li>
              <Avatar id={entry.userid} />
              <p><b>{entry.username ?? entry.userid}</b> {entry.text}</p>
              <time>{timeAgo(entry.datetime)}</time>
            </li>
          {:else}
            <li class="faint">Nothing yet.</li>
          {/each}
        {/if}
      </ol>
    </aside>
  </div>
{/if}
