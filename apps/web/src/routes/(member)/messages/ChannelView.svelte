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
  // Too many streams open elsewhere, so this one gets no live updates.
  let streamRefused = $state(false);
  let load = 0;
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

  // Merged rather than replaced: live messages may land before the history does, and a (re)connect may have
  // missed some, so both keep what's already there, older pages included.
  async function refresh(name: string, first: boolean) {
    const atBottom = nearBottom();
    const latest = await channelHistory(name);
    if (channel.name !== name) return;
    add(latest.messages);
    if (first) more = latest.more;
    if (first || atBottom) scrollDown();
  }

  $effect(() => {
    const name = channel.name;
    const token = ++load;
    messages = [];
    more = false;
    loading = true;
    streamRefused = false;
    const controller = new AbortController();
    untrack(() => refresh(name, true))
      .catch((error) => flash.show('error', describe(error)))
      .finally(() => {
        if (token === load) loading = false;
      });
    channelStream(
      name,
      (message) => {
        if (!message) {
          refresh(name, false).catch(() => null);
          return;
        }
        const atBottom = nearBottom();
        add([message]);
        if (atBottom) scrollDown();
      },
      controller.signal
    ).then((status) => {
      if (status === 429 && token === load) streamRefused = true;
    });
    return () => controller.abort();
  });

  // Scrolling near the top loads the page before, keeping what's on screen where it was.
  async function older() {
    if (!messages.length || !more || loadingOlder) return;
    loadingOlder = true;
    try {
      const height = scroller?.scrollHeight ?? 0;
      const name = channel.name;
      const page = await channelHistory(name, messages[0].id);
      if (channel.name !== name) return;
      add(page.messages);
      more = page.more;
      requestAnimationFrame(() => {
        if (scroller) scroller.scrollTop = scroller.scrollHeight - height;
      });
    } catch (error) {
      flash.show('error', describe(error));
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
{#if streamRefused}
  <p class="composer-note muted">{describe(new ApiError(429, 'site.too_many_streams'))}</p>
{/if}
{#if blocked}
  <p class="composer-note muted">{describe(new ApiError(403, blocked))}</p>
{:else}
  {#if command}<p class="composer-note muted">{m.common_error_channel_no_commands()}</p>{/if}
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
