<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { env } from '$env/dynamic/public';
  import { describe } from '$lib/api/messages';
  import { discordLink, linkDiscord, unlinkDiscord, type DiscordLink } from '$lib/api/settings';
  import { flash } from '$lib/flash.svelte';

  const STATE_KEY = 'soumetsu.discord-state';

  let link = $state.raw<DiscordLink | null>(null);
  let failed = $state(false);
  let busy = $state(false);

  const redirectUri = $derived(`${page.url.origin}/settings/discord-integration`);

  // Discord sends the player back here with a code, which the API trades for the account.
  $effect(() => {
    const code = page.url.searchParams.get('code');
    const state = page.url.searchParams.get('state');
    if (!code) {
      discordLink().then(
        (result) => (link = result),
        () => (failed = true)
      );
      return;
    }
    const expected = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    goto('/settings/discord-integration', { replaceState: true });
    if (!expected || state !== expected) {
      flash.show('error', 'An error occurred. Please try linking Discord again.');
      return;
    }
    linkDiscord(code, redirectUri).then(
      (result) => {
        link = result;
        flash.show('success', 'Your Discord account has been linked.');
      },
      (error) => {
        failed = true;
        flash.show('error', describe(error));
      }
    );
  });

  function connect() {
    const state = crypto.randomUUID();
    sessionStorage.setItem(STATE_KEY, state);
    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', env.PUBLIC_DISCORD_CLIENT_ID ?? '');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify');
    url.searchParams.set('state', state);
    location.href = url.href;
  }

  async function unlink() {
    busy = true;
    try {
      await unlinkDiscord();
      link = { discord_id: null };
      flash.show('success', 'Your Discord account has been unlinked.');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }

  const linked = $derived(!!link?.discord_id);
</script>

<h2 class="section-title c-discord"><i class="fa-brands fa-discord"></i>Discord linking</h2>
<div class="panel link-card {linked ? 'linked' : ''} c-discord">
  <span class="link-icon"><i class="fa-brands fa-discord"></i></span>
  {#if failed}
    <div><p>Couldn't load your Discord link. Try again in a bit.</p></div>
  {:else if link === null}
    <div><span class="skel" style="width: 160px"></span></div>
  {:else if linked}
    <div>
      <h2>{link.discord_username ? `@${link.discord_username}` : 'Discord account'}</h2>
      <p>Logged in with Discord. It shows on your profile.</p>
    </div>
    <button class="btn" type="button" disabled={busy} onclick={unlink}>Unlink account</button>
  {:else}
    <div>
      <h2>Not linked</h2>
      <p>Link your Discord account to show it on your profile.</p>
    </div>
    <button class="btn btn-blue" type="button" onclick={connect}>
      <i class="fa-brands fa-discord"></i>Link Discord
    </button>
  {/if}
</div>
