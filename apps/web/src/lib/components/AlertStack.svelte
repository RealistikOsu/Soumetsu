<script lang="ts">
  import { isPublic } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { m } from '$lib/paraglide/messages';
  import { sanitise } from '$lib/sanitise';
  import { site } from '$lib/site.svelte';

  const restricted = $derived(session.user !== null && !isPublic(session.user.privileges));
  const info = $derived(site.info);
  const visible = $derived(
    restricted ||
      session.frozen ||
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
  </div>
{/if}
