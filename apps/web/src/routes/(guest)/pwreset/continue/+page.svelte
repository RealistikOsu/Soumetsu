<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { finishReset, resetOwner } from '$lib/api/auth';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AuthLayout from '$lib/components/AuthLayout.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';
  import { passwordProblem } from '$lib/passwords';

  const key = $derived(page.url.searchParams.get('k') ?? '');
  const owner = query((signal) => resetOwner(key, signal));

  let password = $state('');
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const problem = await passwordProblem(password);
    if (problem) return flash.show('error', problem);

    busy = true;
    try {
      await finishReset(key, password);
      flash.next('success', m.auth_reset_done());
      await goto('/login');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

{#if owner.state.status === 'error'}
  <NotFound />
{:else}
  <AuthLayout
    image="login.jpg"
    heading={m.auth_reset_heading()}
    sub={m.auth_reset_sub()}
    colour="c-orange"
    icon="fa-key"
    title={m.auth_reset_title()}
  >
    {#snippet card()}
      <p class="auth-sub">
        {owner.state.status === 'ready'
          ? m.auth_reset_greeting_name({ name: owner.state.data.username })
          : m.auth_reset_greeting()}
      </p>
      <form class="auth-form" onsubmit={submit}>
        <div class="field">
          <label for="password">{m.auth_new_password()}</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            minlength="8"
            autocomplete="new-password"
            required
          />
          <small>{m.auth_password_min()}</small>
        </div>
        <button class="btn btn-orange" type="submit" disabled={busy}>{m.auth_reset_submit()}</button
        >
      </form>
    {/snippet}
    {#snippet aside()}
      <SectionTitle colour="c-blue" icon="fa-shield-halved">{m.auth_reset_checks()}</SectionTitle>
      <ul class="panel new-here password-rules c-blue">
        <li><i class="fa-solid fa-ruler-horizontal"></i>{m.auth_reset_rule_length()}</li>
        <li><i class="fa-solid fa-list-ol"></i>{m.auth_reset_rule_common()}</li>
      </ul>
      <h2 class="section-title c-discord">
        <i class="fa-brands fa-discord"></i>{m.auth_still_stuck()}
      </h2>
      <a class="discord" href="/discord">
        {m.auth_ask_discord()}<small>{m.auth_reset_discord_hint()}</small>
      </a>
    {/snippet}
  </AuthLayout>
{/if}
