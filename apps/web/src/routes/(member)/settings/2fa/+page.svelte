<script lang="ts">
  import QRCode from 'qrcode';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import {
    confirmSetup,
    disableTwoFactor,
    newRecoveryCodes,
    sendSetupLink,
    startSetup,
    twoFactorStatus
  } from '$lib/api/twoFactor';
  import { session } from '$lib/auth/session.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  const status = query((signal) => twoFactorStatus(signal));
  // Staff arrive here from the emailed link, which carries the token that lets them start setup.
  const setupToken = $derived(page.url.searchParams.get('setup'));

  let setup = $state<{ secret: string; qr: string } | null>(null);
  let code = $state('');
  let recovery = $state<string[] | null>(null);
  let busy = $state(false);
  let linkSent = $state(false);

  async function run(action: () => Promise<void>) {
    busy = true;
    try {
      await action();
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }

  const begin = () =>
    run(async () => {
      const started = await startSetup(setupToken);
      setup = { secret: started.secret, qr: await QRCode.toDataURL(started.uri, { margin: 1 }) };
      // The token is spent, so it shouldn't linger in the address bar.
      if (setupToken) await goto('/settings/2fa', { replaceState: true, keepFocus: true });
    });

  const confirm = () =>
    run(async () => {
      recovery = (await confirmSetup(code.trim())).recovery_codes;
      setup = null;
      code = '';
      await session.refresh();
      status.reload();
      flash.show('success', m.settings_2fa_enabled());
    });

  const regenerate = () =>
    run(async () => {
      recovery = (await newRecoveryCodes(code.trim())).recovery_codes;
      code = '';
      status.reload();
    });

  const disable = () =>
    run(async () => {
      await disableTwoFactor(code.trim());
      code = '';
      recovery = null;
      status.reload();
      flash.show('success', m.settings_2fa_disabled());
    });

  const emailLink = () =>
    run(async () => {
      await sendSetupLink();
      linkSent = true;
    });
</script>

<SectionTitle colour="c-lblue" icon="fa-shield-halved">{m.settings_2fa_title()}</SectionTitle>
<div class="panel form-panel c-lblue two-factor">
  {#if status.state.status === 'loading'}
    <span class="skel" style="width: 60%"></span>
  {:else if status.state.status === 'error'}
    <p class="muted">{describe(status.state.error)}</p>
  {:else}
    {@const info = status.state.data}
    {#if recovery}
      <p>{m.settings_2fa_recovery_intro()}</p>
      <ul class="recovery-codes">
        {#each recovery as item (item)}<li><code>{item}</code></li>{/each}
      </ul>
      <button
        class="btn"
        type="button"
        onclick={() => navigator.clipboard.writeText(recovery!.join('\n'))}
      >
        <i class="fa-solid fa-copy"></i>{m.settings_2fa_copy()}
      </button>
    {/if}

    {#if info.enabled}
      <p>
        <i class="fa-solid fa-circle-check"></i>
        {m.settings_2fa_on({ count: info.recovery_codes_left })}
      </p>
      <div class="field">
        <label for="code">{m.settings_2fa_code()}</label>
        <input id="code" type="text" bind:value={code} autocomplete="one-time-code" />
      </div>
      <div class="form-actions">
        <button class="btn" type="button" disabled={busy || !code} onclick={regenerate}>
          {m.settings_2fa_new_codes()}
        </button>
        {#if !info.required}
          <button class="btn btn-red" type="button" disabled={busy || !code} onclick={disable}>
            {m.settings_2fa_disable()}
          </button>
        {/if}
      </div>
    {:else if setup}
      <p>{m.settings_2fa_scan()}</p>
      <img class="qr" src={setup.qr} alt="" width="200" height="200" />
      <p class="muted">{m.settings_2fa_manual()} <code>{setup.secret}</code></p>
      <div class="field">
        <label for="code">{m.settings_2fa_code()}</label>
        <input id="code" type="text" bind:value={code} autocomplete="one-time-code" />
      </div>
      <button class="btn btn-blue" type="button" disabled={busy || !code} onclick={confirm}>
        {m.settings_2fa_confirm()}
      </button>
    {:else if info.required && !setupToken}
      <p>{m.settings_2fa_staff()}</p>
      {#if linkSent}
        <p class="muted">{m.settings_2fa_link_sent()}</p>
      {:else}
        <button class="btn btn-blue" type="button" disabled={busy} onclick={emailLink}>
          <i class="fa-solid fa-envelope"></i>{m.settings_2fa_email_link()}
        </button>
      {/if}
    {:else}
      <p>{m.settings_2fa_intro()}</p>
      <button class="btn btn-blue" type="button" disabled={busy} onclick={begin}>
        {m.settings_2fa_start()}
      </button>
    {/if}
  {/if}
</div>
