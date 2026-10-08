<script lang="ts">
  import { parseChat } from '$lib/chat-format';
  import { dateTime } from '$lib/format';

  // `name` is who /me actions are about.
  let { content, name, time }: { content: string; name: string; time: number } = $props();

  const chat = $derived(parseChat(content));
</script>

<p class:chat-action={chat.action} title={dateTime(time)}>
  {#if chat.action}{name + ' '}{/if}{#each chat.parts as part, n (n)}{#if 'href' in part}<a
        href={part.href}
        target={part.external ? '_blank' : undefined}
        rel={part.external ? 'noopener noreferrer' : undefined}>{part.text}</a
      >{:else}{part.text}{/if}{/each}
</p>
