<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { card } from '$lib/api/cards';
  import {
    conversations as loadConversations,
    reportMessage,
    sendMessage,
    thread as loadThread,
    type ChatMessage,
    type Conversation
  } from '$lib/api/chat';
  import { describe } from '$lib/api/messages';
  import { session } from '$lib/auth/session.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import { flash } from '$lib/flash.svelte';
  import { chatPreview, parseChat } from '$lib/chat-format';
  import { dateTime, timeAgo } from '$lib/format';
  import { inbox } from '$lib/inbox.svelte';
  import { m } from '$lib/paraglide/messages';

  const MAX_LENGTH = 1000;

  const me = $derived(session.user!.id);
  const peerId = $derived(Number(page.url.searchParams.get('with')) || null);

  let list = $state.raw<Conversation[] | null>(null);
  // Someone opened from their profile that there's no conversation with yet.
  let stranger = $state.raw<Conversation['peer'] | null>(null);
  let messages = $state.raw<ChatMessage[]>([]);
  let more = $state(false);
  let peerReadId = $state(0);
  let loadingThread = $state(false);
  let loadingOlder = false;
  let draft = $state('');
  let sending = $state(false);
  let reporting = $state<ChatMessage | null>(null);
  let reportOpen = $state(false);
  let reason = $state('');
  let scroller = $state<HTMLElement>();

  const peer = $derived(
    list?.find((c) => c.peer.id === peerId)?.peer ?? (stranger?.id === peerId ? stranger : null)
  );
  const lastMine = $derived(messages.findLast((message) => message.from === me));

  async function refreshList() {
    list = await loadConversations().catch(() => list ?? []);
  }

  const scrollDown = () =>
    requestAnimationFrame(() => scroller?.scrollTo({ top: scroller.scrollHeight }));

  // Polling only fetches the newest page, which is merged in so older pages that were loaded stay.
  async function refreshThread(id: number, first: boolean) {
    const atBottom =
      !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40;
    const latest = await loadThread(id);
    if (peerId !== id) return;
    const known = first ? [] : messages.filter((message) => message.id < latest.messages[0]?.id);
    messages = [...known, ...latest.messages];
    if (first) more = latest.more;
    peerReadId = latest.peerReadId;
    if (first || atBottom) scrollDown();
  }

  $effect(() => {
    refreshList();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshList();
    }, 30_000);
    return () => clearInterval(timer);
  });

  $effect(() => {
    const id = peerId;
    messages = [];
    more = false;
    if (!id) return;
    loadingThread = true;
    // refreshThread reads the scroll box, which mustn't make this rerun once the box appears.
    untrack(() => refreshThread(id, true))
      .then(() => inbox.refresh())
      .catch((error) => flash.show('error', describe(error)))
      .finally(() => (loadingThread = false));
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshThread(id, false).catch(() => null);
    }, 8_000);
    return () => clearInterval(timer);
  });

  $effect(() => {
    const id = peerId;
    if (!id || !list || list.some((c) => c.peer.id === id) || stranger?.id === id) return;
    card(id).then(
      (found) => (stranger = { id: found.id, username: found.username, country: found.country }),
      () => goto('/messages', { replaceState: true })
    );
  });

  // Scrolling near the top loads the page before, keeping what's on screen where it was.
  async function older() {
    if (!peerId || !messages.length || !more || loadingOlder) return;
    loadingOlder = true;
    try {
      const height = scroller?.scrollHeight ?? 0;
      const page = await loadThread(peerId, messages[0].id);
      messages = [...page.messages, ...messages];
      more = page.more;
      requestAnimationFrame(() => {
        if (scroller) scroller.scrollTop = scroller.scrollHeight - height;
      });
    } finally {
      loadingOlder = false;
    }
  }

  async function send(event?: SubmitEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!peerId || !content || sending) return;
    sending = true;
    try {
      const sent = await sendMessage(peerId, content);
      messages = [...messages, sent];
      draft = '';
      scrollDown();
      refreshList();
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      sending = false;
    }
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  async function submitReport(event: SubmitEvent) {
    event.preventDefault();
    if (!reporting) return;
    try {
      await reportMessage(reporting.id, reason.trim());
      flash.show('success', m.messages_report_sent());
      reportOpen = false;
      reason = '';
    } catch (error) {
      flash.show('error', describe(error));
    }
  }
</script>

<svelte:head><title>{m.messages_title()} · RealistikOsu</title></svelte:head>

<main class="wrap messages-page" class:has-thread={!!peerId}>
  <aside class="panel conversations">
    <h1>{m.messages_title()}</h1>
    {#if list === null}
      {#each [0, 1, 2, 3] as n (n)}<span class="skel conversation-skel"></span>{/each}
    {:else}
      {#if stranger && !list.some((c) => c.peer.id === stranger?.id)}
        <a class="conversation" class:active={peerId === stranger.id} href="?with={stranger.id}">
          <Avatar id={stranger.id} />
          <div><b>{stranger.username}</b><span class="muted">{m.messages_new()}</span></div>
        </a>
      {/if}
      {#each list as conversation (conversation.peer.id)}
        <a
          class="conversation"
          class:active={peerId === conversation.peer.id}
          class:unread={conversation.unread > 0}
          href="?with={conversation.peer.id}"
        >
          <Avatar id={conversation.peer.id} />
          <div>
            <b>{conversation.peer.username}</b>
            <span class="muted"
              >{conversation.last.from === me ? m.messages_you() : ''}{chatPreview(
                conversation.last.content
              )}</span
            >
          </div>
          <span class="when">
            {timeAgo(conversation.last.time)}
            {#if conversation.unread}<span class="inbox-count">{conversation.unread}</span>{/if}
          </span>
        </a>
      {:else}
        {#if !stranger}<p class="muted empty">{m.messages_empty()}</p>{/if}
      {/each}
    {/if}
  </aside>

  <section class="panel thread">
    {#if peer}
      <header>
        <a class="back" href="/messages" aria-label={m.messages_back()}>
          <i class="fa-solid fa-arrow-left"></i>
        </a>
        <a class="who" href="/users/{peer.id}">
          <Avatar id={peer.id} />
          <b>{peer.username}</b>
          {#if peer.country !== 'XX'}<Flag country={peer.country} />{/if}
        </a>
      </header>
      <div
        class="thread-messages"
        bind:this={scroller}
        onscroll={() => {
          if (scroller && scroller.scrollTop < 120) older();
        }}
      >
        {#if more}
          <span class="older"><i class="fa-solid fa-circle-notch fa-spin"></i></span>
        {/if}
        {#each messages as message, i (message.id)}
          {@const chat = parseChat(message.content)}
          {@const first = messages[i - 1]?.from !== message.from}
          <div class="message" class:mine={message.from === me} class:first>
            {#if first}<Avatar id={message.from} />{:else}<span class="avatar-gap"></span>{/if}
            <p class:chat-action={chat.action} title={dateTime(message.time)}>
              {#if chat.action}{(message.from === me ? session.user!.username : peer.username) +
                  ' '}{/if}{#each chat.parts as part, n (n)}{#if 'href' in part}<a
                    href={part.href}
                    target={part.external ? '_blank' : undefined}
                    rel={part.external ? 'noopener noreferrer' : undefined}>{part.text}</a
                  >{:else}{part.text}{/if}{/each}
            </p>
            {#if message.from !== me}
              <button
                class="report"
                type="button"
                title={m.messages_report()}
                aria-label={m.messages_report()}
                onclick={() => {
                  reporting = message;
                  reportOpen = true;
                }}
              >
                <i class="fa-solid fa-flag"></i>
              </button>
            {/if}
          </div>
          {#if message === lastMine}
            <span class="seen">
              {peerReadId >= message.id ? m.messages_seen() : dateTime(message.time)}
            </span>
          {/if}
        {:else}
          {#if !loadingThread}<p class="muted empty">{m.messages_start()}</p>{/if}
        {/each}
      </div>
      <form class="composer" onsubmit={send}>
        <textarea
          bind:value={draft}
          rows="1"
          maxlength={MAX_LENGTH}
          placeholder={m.messages_placeholder({ name: peer.username })}
          onkeydown={onKey}></textarea>
        <button
          class="btn btn-blue"
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label={m.messages_send()}
        >
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    {:else}
      <p class="muted empty">{m.messages_pick()}</p>
    {/if}
  </section>
</main>

<Dialog bind:open={reportOpen} class="pin-dialog">
  <button class="dialog-close" aria-label={m.messages_close()} onclick={() => (reportOpen = false)}>
    <i class="fa-solid fa-xmark"></i>
  </button>
  <h2>{m.messages_report_title()}</h2>
  <p class="muted">{m.messages_report_explain()}</p>
  {#if reporting}<blockquote class="reported">{chatPreview(reporting.content)}</blockquote>{/if}
  <form onsubmit={submitReport}>
    <div class="field">
      <label for="report-reason">{m.messages_report_reason()}</label>
      <input id="report-reason" type="text" maxlength="255" bind:value={reason} required />
    </div>
    <div class="dialog-actions">
      <button class="btn btn-red" type="submit" disabled={!reason.trim()}>
        {m.messages_report()}
      </button>
    </div>
  </form>
</Dialog>
