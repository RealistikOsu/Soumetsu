<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import type { ScoreWithBeatmap } from '$lib/api/scores';
  import {
    sendUploadRequest,
    uploadRequests,
    voteUploadRequest,
    withdrawUploadRequest,
    type UploadRequest,
    type UploadStatus
  } from '$lib/api/uploads';
  import { session } from '$lib/auth/session.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import ScoreDialog from '$lib/components/ScoreDialog.svelte';
  import ScoreRow from '$lib/components/ScoreRow.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Username from '$lib/components/Username.svelte';
  import { flash } from '$lib/flash.svelte';
  import { dateTime, timeAgo } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const MAX_PENDING = 3;
  const MAX_REASON = 1000;

  const tabs: { status: UploadStatus; label: () => string }[] = [
    { status: 'pending', label: m.uploads_tab_pending },
    { status: 'accepted', label: m.uploads_tab_accepted },
    { status: 'rejected', label: m.uploads_tab_rejected }
  ];
  const tags: Record<UploadStatus, { colour: string; icon: string; label: () => string }> = {
    pending: { colour: 'c-yellow', icon: 'fa-hourglass-half', label: m.uploads_status_pending },
    accepted: { colour: 'c-green', icon: 'fa-circle-check', label: m.uploads_status_accepted },
    rejected: { colour: 'c-red', icon: 'fa-circle-xmark', label: m.uploads_status_rejected }
  };

  const status = $derived(
    tabs.find((tab) => tab.status === page.url.searchParams.get('status'))?.status ?? 'pending'
  );
  const current = $derived(Math.max(1, Number(page.url.searchParams.get('p')) || 1));
  const me = $derived(session.user?.id);

  const list = query((signal) => uploadRequests(status, current, signal));

  // Votes are updated in place so the list doesn't flash back to its skeleton.
  let votes = $state.raw<Record<number, Pick<UploadRequest, 'up' | 'down' | 'mine'>>>({});
  $effect(() => {
    void list.state;
    votes = {};
  });

  let detail = $state<ScoreWithBeatmap | null>(null);
  let detailOpen = $state(false);

  let scoreId = $state('');
  let skinUrl = $state('');
  let reason = $state('');
  let sending = $state(false);

  const go = (next: { status?: UploadStatus; p?: number }) => {
    const url = new URL(page.url);
    url.searchParams.set('status', next.status ?? status);
    if (next.p && next.p > 1) url.searchParams.set('p', String(next.p));
    else url.searchParams.delete('p');
    return goto(url, { keepFocus: true });
  };

  async function send(event: SubmitEvent) {
    event.preventDefault();
    sending = true;
    try {
      await sendUploadRequest({ score_id: Number(scoreId), skin_url: skinUrl, reason });
      flash.show('success', m.uploads_sent());
      scoreId = skinUrl = reason = '';
      if (status === 'pending' && current === 1) list.reload();
      else go({ status: 'pending' });
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      sending = false;
    }
  }

  async function vote(request: UploadRequest, value: -1 | 1) {
    const mine = (votes[request.id] ?? request).mine === value ? 0 : value;
    try {
      votes = { ...votes, [request.id]: await voteUploadRequest(request.id, mine) };
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  async function withdraw(request: UploadRequest) {
    try {
      await withdrawUploadRequest(request.id);
      flash.show('success', m.uploads_withdrawn());
      list.reload();
    } catch (error) {
      flash.show('error', describe(error));
    }
  }
</script>

<svelte:head><title>{m.uploads_title()} · RealistikOsu</title></svelte:head>

<Banner image="rank-request.jpg">
  <div>
    <h1>{m.uploads_title()}</h1>
    <p class="sub">{m.uploads_sub()}</p>
  </div>
</Banner>

<main class="wrap uploads">
  <div>
    <nav class="tabs" use:tabInk>
      {#each tabs as tab (tab.status)}
        <a
          class:active={tab.status === status}
          href="?status={tab.status}"
          onclick={(event) => {
            event.preventDefault();
            go({ status: tab.status });
          }}>{tab.label()}</a
        >
      {/each}
    </nav>

    {#if list.state.status === 'ready'}
      {#each list.state.data.requests as request (request.id)}
        {@const shown = votes[request.id] ?? request}
        {@const tag = tags[request.status]}
        <article class="panel upload {tag.colour}">
          <header>
            <a class="upload-who" href="/users/{request.user.id}">
              <Avatar id={request.user.id} />
              <Flag country={request.user.country} />
              <Username id={request.user.id} name={request.user.username} />
            </a>
            <span class="muted" title={dateTime(request.created_at)}
              >{timeAgo(request.created_at)}</span
            >
            <span class="upload-tag"><i class="fa-solid {tag.icon}"></i>{tag.label()}</span>
          </header>

          <p class="upload-reason">{request.reason}</p>

          {#if request.score}
            {@const score = request.score}
            <div class="score-list upload-score">
              <ScoreRow
                {score}
                ondetails={() => {
                  detail = score;
                  detailOpen = true;
                }}
                onpin={() => null}
              />
            </div>
          {:else}
            <p class="faint">{m.uploads_score_missing()}</p>
          {/if}
          {#if request.skin_url}
            <a
              class="upload-skin"
              href={request.skin_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i class="fa-solid fa-download"></i>{m.uploads_skin()}
            </a>
          {/if}

          <footer>
            <button
              class="vote"
              class:chosen={shown.mine === 1}
              type="button"
              title={me ? m.uploads_vote_up() : m.uploads_vote_login()}
              aria-label={m.uploads_vote_up()}
              aria-pressed={shown.mine === 1}
              disabled={!me || me === request.user.id || request.status !== 'pending'}
              onclick={() => vote(request, 1)}
            >
              <i class="fa-solid fa-thumbs-up"></i>{shown.up}
            </button>
            <button
              class="vote down"
              class:chosen={shown.mine === -1}
              type="button"
              title={me ? m.uploads_vote_down() : m.uploads_vote_login()}
              aria-label={m.uploads_vote_down()}
              aria-pressed={shown.mine === -1}
              disabled={!me || me === request.user.id || request.status !== 'pending'}
              onclick={() => vote(request, -1)}
            >
              <i class="fa-solid fa-thumbs-down"></i>{shown.down}
            </button>
            {#if me === request.user.id && request.status === 'pending'}
              <button class="btn withdraw" type="button" onclick={() => withdraw(request)}>
                <i class="fa-solid fa-trash"></i>{m.uploads_withdraw()}
              </button>
            {/if}
          </footer>
        </article>
      {:else}
        <p class="empty-note">{m.uploads_empty()}</p>
      {/each}

      {#if list.state.data.pages > 1}
        <Pager
          page={current}
          pages={list.state.data.pages}
          hasNext={current < list.state.data.pages}
          onpage={(p) => go({ p })}
        />
      {/if}
    {:else if list.state.status === 'loading'}
      {#each [0, 1, 2] as n (n)}<span class="skel upload-skel"></span>{/each}
    {:else}
      <p class="empty-note">{m.uploads_error()}</p>
    {/if}
  </div>

  <aside>
    <SectionTitle colour="c-red" icon="fa-circle-play">{m.uploads_form_title()}</SectionTitle>
    {#if session.user}
      <form class="panel upload-form c-red" onsubmit={send}>
        <div class="field">
          <label for="score">{m.uploads_score_id_label()}</label>
          <input
            id="score"
            type="number"
            min="1"
            inputmode="numeric"
            bind:value={scoreId}
            required
          />
          <small>{m.uploads_score_id_hint()}</small>
        </div>
        <div class="field">
          <label for="skin">{m.uploads_skin_label()}</label>
          <input id="skin" type="url" maxlength="255" bind:value={skinUrl} />
          <small>{m.uploads_skin_hint()}</small>
        </div>
        <div class="field">
          <label for="reason">{m.uploads_reason_label()}</label>
          <textarea id="reason" rows="4" maxlength={MAX_REASON} bind:value={reason} required
          ></textarea>
        </div>
        <button class="btn btn-red" type="submit" disabled={sending}>
          <i class="fa-solid fa-paper-plane"></i>{m.uploads_send()}
        </button>
      </form>
    {:else if session.ready}
      <div class="panel upload-form c-red">
        <p>{m.uploads_login()}</p>
        <a class="btn btn-blue" href="/login?redir={encodeURIComponent(page.url.pathname)}">
          {m.uploads_login_button()}
        </a>
      </div>
    {/if}

    <SectionTitle colour="c-blue" icon="fa-circle-info">{m.uploads_rules_title()}</SectionTitle>
    <ul class="panel upload-rules c-blue">
      <li>{m.uploads_rules_exemplary()}</li>
      <li>{m.uploads_rules_votes()}</li>
      <li>{m.uploads_rules_discussion()}</li>
      <li>{m.uploads_rules_limit({ max: MAX_PENDING })}</li>
      <li>
        <a href="https://www.youtube.com/channel/UCB4ZHmte2N9jC-jO3xi4eSw">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>{m.uploads_channel()}
        </a>
      </li>
    </ul>
  </aside>
</main>

<ScoreDialog score={detail} bind:open={detailOpen} />
