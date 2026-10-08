<script lang="ts">
  import { untrack } from 'svelte';
  import {
    channelHistory,
    channelStream,
    postToChannel,
    type Channel,
    type ChannelMessage
  } from '$lib/api/channels';
  import { ApiError } from '$lib/api/errors';
  import { describe } from '$lib/api/messages';
  import { session } from '$lib/auth/session.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { flash } from '$lib/flash.svelte';
  import { dayLabel, fromIso, sameDay } from '$lib/format';
  import { m } from '$lib/paraglide/messages';
  import ChatText from './ChatText.svelte';

  const MAX_LENGTH = 1000;

  let { channel, blocked }: { channel: Channel; blocked: string | null } = $props();

  const me = $derived(session.user!.id);
  const bare = $derived(channel.name.replace(/^#/, ''));

  let messages = $state.raw<ChannelMessage[]>([]);
  let more = $state(false);
  let loading = $state(false);
  let loadingOlder = false;
  let draft = $state('');
  let sending = $state(false);
  let scroller = $state<HTMLElement>();

  const command = $derived(draft.trimStart().startsWith('!'));

  const nearBottom = () =>
    !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40;

  const scrollDown = () =>
    requestAnimationFrame(() => scroller?.scrollTo({ top: scroller.scrollHeight }));

  function add(incoming: ChannelMessage[]) {
    const known = messages.filter((message) => !incoming.some((other) => other.id === message.id));
    messages = [...known, ...incoming].sort((a, b) => a.id - b.id);
  }

  // A (re)connect may have missed messages, so the newest page is merged in, keeping older pages.
  async function refresh(name: string, first: boolean) {
    const atBottom = nearBottom();
    const latest = await channelHistory(name);
    if (channel.name !== name) return;
    if (first) {
      messages = latest.messages;
      more = latest.more;
    } else {
      add(latest.messages);
    }
    if (first || atBottom) scrollDown();
  }

  $effect(() => {
    const name = channel.name;
    messages = [];
    more = false;
    loading = true;
    const controller = new AbortController();
    let connected = false;
    untrack(() => refresh(name, true))
      .catch((error) => flash.show('error', describe(error)))
      .finally(() => (loading = false));
    channelStream(
      name,
      (message) => {
        if (!message) {
          // The first connect races the history load above, which already covers it.
          if (connected) refresh(name, false).catch(() => null);
          connected = true;
          return;
        }
        const atBottom = nearBottom();
        add([message]);
        if (atBottom) scrollDown();
      },
      controller.signal
    );
    return () => controller.abort();
  });

  // Scrolling near the top loads the page before, keeping what's on screen where it was.
  async function older() {
    if (!messages.length || !more || loadingOlder) return;
    loadingOlder = true;
    try {
      const height = scroller?.scrollHeight ?? 0;
      const page = await channelHistory(channel.name, messages[0].id);
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
    if (!content || sending || command || blocked) return;
    sending = true;
    try {
      add([await postToChannel(channel.name, content)]);
      draft = '';
      scrollDown();
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
</script>

<header>
  <a class="back" href="/messages" aria-label={m.messages_back()}>
    <i class="fa-solid fa-arrow-left"></i>
  </a>
  <div class="who">
    <span class="channel-mark">#</span>
    <div>
      <b>{bare}</b>
      {#if channel.description}<span class="muted">{channel.description}</span>{/if}
    </div>
  </div>
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
    {@const time = fromIso(message.time)}
    {@const previous = messages[i - 1]}
    {@const newDay = !previous || !sameDay(fromIso(previous.time), time)}
    {@const first = newDay || previous.sender.id !== message.sender.id}
    {@const mine = message.sender.id === me}
    {#if newDay}<div class="day-divider"><span>{dayLabel(time)}</span></div>{/if}
    <div class="message" class:mine class:first>
      {#if first}
        <a href="/users/{message.sender.id}" tabindex="-1" aria-hidden="true">
          <Avatar id={message.sender.id} />
        </a>
      {:else}<span class="avatar-gap"></span>{/if}
      <div class="message-body">
        {#if first && !mine}
          <a class="sender" href="/users/{message.sender.id}">{message.sender.username}</a>
        {/if}
        <ChatText content={message.content} name={message.sender.username} {time} />
      </div>
    </div>
  {:else}
    {#if !loading}<p class="muted empty">{m.messages_channel_empty()}</p>{/if}
  {/each}
</div>
{#if blocked}
  <p class="composer-note muted">{describe(new ApiError(403, blocked))}</p>
{:else}
  {#if command}<p class="composer-note muted">{m.messages_channel_commands()}</p>{/if}
  <form class="composer" onsubmit={send}>
    <textarea
      bind:value={draft}
      rows="1"
      maxlength={MAX_LENGTH}
      placeholder={m.messages_channel_placeholder({ channel: bare })}
      onkeydown={onKey}></textarea>
    <button
      class="btn btn-blue"
      type="submit"
      disabled={sending || !draft.trim() || command}
      aria-label={m.messages_send()}
    >
      <i class="fa-solid fa-paper-plane"></i>
    </button>
  </form>
{/if}
