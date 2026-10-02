<script lang="ts">
  import { slide } from 'svelte/transition';
  import { flash, type FlashKind } from '$lib/flash.svelte';
  import { isPublic } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';
  import { sanitise } from '$lib/sanitise';
  import { site } from '$lib/site.svelte';

  const kinds: Record<FlashKind, { colour: string; icon: string; heading: string }> = {
    error: { colour: 'c-red', icon: 'fa-fire', heading: m.common_alert_error_heading() },
    success: { colour: 'c-green', icon: 'fa-check', heading: m.common_alert_success_heading() },
    warning: {
      colour: 'c-orange',
      icon: 'fa-exclamation',
      heading: m.common_alert_warning_heading()
    }
  };

  const restricted = $derived(session.user !== null && !isPublic(session.user.privileges));
  const info = $derived(site.info);
  const visible = $derived(
    restricted ||
      session.frozen ||
      flash.items.length > 0 ||
      !!info?.globalAlert ||
      info?.gameMaintenance ||
      info?.websiteMaintenance
  );
</script>

{#if visible}
  <div class="wrap site-alerts">
    {#if restricted}
      <div class="notice alert c-red" role="alert">
        <i class="fa-solid fa-ban notice-icon"></i>
        <div>
          <b>{m.common_alert_restricted_title()}</b>
          {m.common_alert_restricted_before()}
          <a href="/discord">{m.common_alert_restricted_link()}</a
          >{m.common_alert_restricted_after()}
        </div>
      </div>
    {/if}
    {#if session.frozen}
      <div class="notice alert c-yellow" role="alert">
        <i class="fa-solid fa-snowflake notice-icon"></i>
        <div>
          <b>{m.common_alert_frozen_title()}</b>
          {m.common_alert_frozen_before()}
          <a href="/discord">{m.common_alert_frozen_link()}</a>{m.common_alert_frozen_after()}
        </div>
      </div>
    {/if}
    {#if info?.globalAlert}
      <div class="notice alert c-blue" role="alert">
        <i class="fa-solid fa-circle-info notice-icon"></i>
        <div>
          <b>{m.common_alert_global_title()}</b>
          {@html sanitise(info.globalAlert)}
        </div>
      </div>
    {/if}
    {#if info?.gameMaintenance}
      <div class="notice alert c-orange" role="alert">
        <i class="fa-solid fa-screwdriver-wrench notice-icon"></i>
        <div>
          <b>{m.common_alert_game_maintenance_title()}</b>
          {m.common_alert_game_maintenance_text()}
        </div>
      </div>
    {/if}
    {#if info?.websiteMaintenance}
      <div class="notice alert c-orange" role="alert">
        <i class="fa-solid fa-screwdriver-wrench notice-icon"></i>
        <div>
          <b>{m.common_alert_web_maintenance_title()}</b>
          {m.common_alert_web_maintenance_text()}
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
          aria-label={m.common_alert_dismiss()}
          onclick={() => flash.dismiss(item.id)}
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {/each}
  </div>
{/if}
