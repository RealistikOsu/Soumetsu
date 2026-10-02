<script lang="ts">
  import { slide } from 'svelte/transition';
  import { flash, type FlashKind } from '$lib/flash.svelte';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  // Pinned to the viewport, so a save at the bottom of a long form is seen without scrolling up.
  const kinds: Record<FlashKind, { colour: string; icon: string; heading: string }> = {
    error: { colour: 'c-red', icon: 'fa-fire', heading: m.common_alert_error_heading() },
    success: { colour: 'c-green', icon: 'fa-check', heading: m.common_alert_success_heading() },
    warning: {
      colour: 'c-orange',
      icon: 'fa-exclamation',
      heading: m.common_alert_warning_heading()
    }
  };
</script>

<div class="toasts" aria-live="polite">
  {#each flash.items as item (item.id)}
    {@const kind = kinds[item.kind]}
    <div class="notice alert {kind.colour}" role="alert" out:slide={{ duration: ms(220) }}>
      <i class="fa-solid {kind.icon} notice-icon"></i>
      <div><b>{kind.heading}</b>{item.text}</div>
      <button
        class="alert-close"
        type="button"
        aria-label={m.common_alert_dismiss()}
        onclick={() => flash.dismiss(item.id)}
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  {/each}
</div>
