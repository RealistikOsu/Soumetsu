<script lang="ts">
  import { slide } from 'svelte/transition';
  import { flash, type FlashKind } from '$lib/flash.svelte';
  import { isPublic } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { ms } from '$lib/motion';

  const kinds: Record<FlashKind, { colour: string; icon: string; heading: string }> = {
    error: { colour: 'c-red', icon: 'fa-fire', heading: 'Uh oh... There has been an error!' },
    success: { colour: 'c-green', icon: 'fa-check', heading: 'Action completed successfully!' },
    warning: { colour: 'c-orange', icon: 'fa-exclamation', heading: 'Warning!' }
  };

  const restricted = $derived(session.user !== null && !isPublic(session.user.privileges));
</script>

{#if restricted || flash.items.length}
  <div class="wrap site-alerts">
    {#if restricted}
      <div class="notice alert c-red" role="alert">
        <i class="fa-solid fa-ban notice-icon"></i>
        <div>
          <b>You have been restricted!</b>
          Your account is currently in restricted mode. You will not be able to do certain actions, and
          your profile can only be seen by you and by RealistikOsu's staff. If you believe we have mistaken
          putting you in restricted mode, or a month has passed since you first saw this, you can send
          an appeal on the <a href="/discord">Discord server</a>.
        </div>
      </div>
    {/if}
    {#each flash.items as item (item.id)}
      {@const kind = kinds[item.kind]}
      <div class="notice alert {kind.colour}" role="alert" out:slide={{ duration: ms(220) }}>
        <i class="fa-solid {kind.icon} notice-icon"></i>
        <div><b>{kind.heading}</b>{item.text}</div>
        <button
          class="alert-close"
          type="button"
          aria-label="Dismiss"
          onclick={() => flash.dismiss(item.id)}
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {/each}
  </div>
{/if}
