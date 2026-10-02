<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    clan as loadClan,
    clanMembers,
    clanMemberStats,
    clanStats,
    leaveClan
  } from '$lib/api/clans';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import { number } from '$lib/format';
  import { allowed, readMode, relaxColours, slideTowards } from '$lib/modes';
  import { CountUp } from '@soumetsu/ui';
  import Avatar from './Avatar.svelte';
  import ClanBadge from './ClanBadge.svelte';
  import Flag from './Flag.svelte';
  import ModeTabs from './ModeTabs.svelte';
  import NotFound from './NotFound.svelte';
  import RelaxTabs from './RelaxTabs.svelte';
  import SectionTitle from './SectionTitle.svelte';
  import Banner from './Banner.svelte';
  import Dialog from './Dialog.svelte';

  let { id }: { id: number } = $props();

  const info = query((signal) => loadClan(id, signal));
  const members = query((signal) => clanMembers(id, signal));

  const view = $derived(readMode(page.url.searchParams));

  function go(next: Partial<typeof view>) {
    const merged = { ...view, ...next };
    if (!allowed(merged.mode, merged.rx)) merged.mode = 0;
    slideTowards(view, merged);
    goto(`?mode=${merged.mode}&rx=${merged.rx}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }

  const stats = query((signal) => clanStats(id, view.mode, view.rx, signal));
  const memberStats = query((signal) => clanMemberStats(id, view.mode, view.rx, signal));

  const owner = $derived(
    members.state.status === 'ready' ? members.state.data.find((m) => m.is_owner) : undefined
  );
  const mine = $derived(session.user?.clan?.id === id);
  const isOwner = $derived(!!session.user && owner?.user_id === session.user.id);
  const ppOf = (userId: number) =>
    memberStats.state.status === 'ready'
      ? memberStats.state.data.find((m) => m.id === userId)?.pp
      : undefined;

  const ordered = $derived(
    members.state.status === 'ready'
      ? members.state.data
          .filter((m) => !m.is_owner)
          .toSorted((a, b) => (ppOf(b.user_id) ?? 0) - (ppOf(a.user_id) ?? 0))
      : []
  );

  let confirming = $state(false);

  async function leave() {
    try {
      await leaveClan(id);
      flash.next('success', "You've left the clan.");
      confirming = false;
      await session.start();
      await goto('/');
    } catch (error) {
      confirming = false;
      flash.show('error', describe(error));
    }
  }
</script>

<svelte:head>
  <title>
    {info.state.status === 'ready' ? `${info.state.data.name}'s Clan Page` : 'Clan'} · RealistikOsu
  </title>
</svelte:head>

{#if info.state.status === 'error'}
  <NotFound />
{:else}
  <Banner image="clans.jpg" class="clan-banner">
    {#if info.state.status === 'ready'}
      <ClanBadge {id} tag={info.state.data.tag} size="large" />
      <div>
        <span class="clan-tag">[{info.state.data.tag}]</span>
        <h1>{info.state.data.name}</h1>
        <p class="sub">{info.state.data.description}</p>
      </div>
      {#if mine && !isOwner}
        <button class="btn leave-clan" type="button" onclick={() => (confirming = true)}>
          <i class="fa-solid fa-right-from-bracket"></i>Leave clan
        </button>
      {:else if isOwner}
        <a class="btn leave-clan" href="/clan/manage"
          ><i class="fa-solid fa-pen-to-square"></i>Manage clan</a
        >
      {/if}
    {:else}
      <div><h1>…</h1></div>
    {/if}
  </Banner>

  <main class="wrap clan-page">
    <div class="clan-top">
      <div>
        <div class="filters mode-switch">
          <RelaxTabs mode={view.mode} rx={view.rx} onselect={(rx) => go({ rx })} />
          <div class="modes">
            <ModeTabs mode={view.mode} rx={view.rx} onselect={(mode) => go({ mode })} />
          </div>
        </div>
        <div class="panel clan-stats {relaxColours[view.rx]}">
          {#if stats.state.status === 'ready'}
            <div class="clan-rank">
              <span>Global rank</span><b><CountUp prefix="#" value={stats.state.data.rank} /></b>
            </div>
            <div class="clan-rank">
              <span>PP</span><b><CountUp value={stats.state.data.total_pp} /></b>
            </div>
            <dl class="stats">
              <div>
                <dt>Ranked score</dt>
                <dd>{number(stats.state.data.total_ranked_score)}</dd>
              </div>
              <div>
                <dt>Total score</dt>
                <dd>{number(stats.state.data.total_total_score)}</dd>
              </div>
            </dl>
          {:else if stats.state.status === 'error'}
            <p class="empty-note">Couldn't load the stats. Try again in a bit.</p>
          {:else}
            <span class="skel" style="width: 100%; height: 90px"></span>
          {/if}
        </div>
      </div>
      <aside>
        <SectionTitle colour="c-orange" icon="fa-crown">Clan owner</SectionTitle>
        {#if owner}
          <a class="member owner" href="/users/{owner.user_id}">
            <Avatar id={owner.user_id} />
            <div>
              <b
                ><Flag country={owner.country} />{owner.username}<i
                  class="fa-solid fa-crown"
                  title="Clan owner"
                ></i></b
              >
              {#if ppOf(owner.user_id)}<span>{number(ppOf(owner.user_id) ?? 0)}pp</span>{/if}
            </div>
          </a>
        {/if}
      </aside>
    </div>

    <SectionTitle colour="c-blue" icon="fa-users">
      Members {#if members.state.status === 'ready'}<small>{members.state.data.length}</small>{/if}
    </SectionTitle>
    <div class="members">
      {#each ordered as member (member.user_id)}
        <a class="member" href="/users/{member.user_id}">
          <Avatar id={member.user_id} />
          <div>
            <b><Flag country={member.country} />{member.username}</b>
            {#if ppOf(member.user_id)}<span>{number(ppOf(member.user_id) ?? 0)}pp</span>{/if}
          </div>
        </a>
      {/each}
    </div>
  </main>

  <Dialog bind:open={confirming} class="pin-dialog">
    <button class="dialog-close" aria-label="Close" onclick={() => (confirming = false)}>
      <i class="fa-solid fa-xmark"></i>
    </button>
    <h2>Leave this clan?</h2>
    <p class="muted">You can join again later with an invite.</p>
    <div class="dialog-actions">
      <button class="btn btn-red" type="button" onclick={leave}>Leave clan</button>
    </div>
  </Dialog>
{/if}
