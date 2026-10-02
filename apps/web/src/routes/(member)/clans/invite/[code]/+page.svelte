<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { joinClan } from '$lib/api/clans';
  import { describe } from '$lib/api/messages';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  // Opening an invite joins the clan, as it did on Hanayo, and lands on the clan's page.
  $effect(() => {
    const code = page.params.code ?? '';
    joinClan(code).then(
      async (joined) => {
        flash.next('success', m.clans_invite_joined());
        await session.start();
        await goto(`/c/${joined.id}`, { replaceState: true });
      },
      async (error) => {
        flash.next('error', describe(error));
        await goto('/clanboard', { replaceState: true });
      }
    );
  });
</script>

<svelte:head><title>{m.clans_invite_title()} · RealistikOsu</title></svelte:head>

<main class="wrap">
  <p class="panel empty-note">
    <i class="fa-solid fa-circle-notch fa-spin"></i>
    {m.clans_invite_joining()}
  </p>
</main>
