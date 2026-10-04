<script lang="ts">
  import { siteApi } from '$lib/api/client';
  import { describe } from '$lib/api/messages';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';
  import Dialog from './Dialog.svelte';

  let { id, username }: { id: number; username: string } = $props();

  const reasons = [
    ['cheating', m.profile_report_cheating],
    ['multiaccount', m.profile_report_multiaccount],
    ['profile', m.profile_report_profile],
    ['insulting', m.profile_report_insulting],
    ['spam', m.profile_report_spam],
    ['other', m.profile_report_other]
  ] as const;

  let open = $state(false);
  let reason = $state<(typeof reasons)[number][0]>('cheating');
  let info = $state('');
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await siteApi.post(`/users/${id}/report`, { reason, info: info.trim() });
      flash.show('success', m.profile_report_sent());
      open = false;
      info = '';
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<button
  class="btn head-report"
  type="button"
  title={m.profile_report()}
  aria-label={m.profile_report()}
  onclick={() => (open = true)}
>
  <i class="fa-solid fa-flag"></i>
</button>

<Dialog bind:open class="pin-dialog">
  <button class="dialog-close" aria-label={m.profile_report_close()} onclick={() => (open = false)}>
    <i class="fa-solid fa-xmark"></i>
  </button>
  <h2>{m.profile_report_title({ name: username })}</h2>
  <p class="muted">{m.profile_report_explain()}</p>
  <form onsubmit={submit}>
    <div class="report-reasons">
      {#each reasons as [value, label] (value)}
        <label>
          <input type="radio" bind:group={reason} {value} />
          <span>{label()}</span>
        </label>
      {/each}
    </div>
    <div class="field">
      <label for="report-info">{m.profile_report_info()}</label>
      <textarea
        id="report-info"
        rows="3"
        maxlength="500"
        bind:value={info}
        required={reason === 'other'}
        placeholder={m.profile_report_info_placeholder()}></textarea>
    </div>
    <div class="dialog-actions">
      <button class="btn btn-red" type="submit" disabled={busy}>{m.profile_report_send()}</button>
    </div>
  </form>
</Dialog>
