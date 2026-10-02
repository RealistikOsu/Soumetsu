<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { joinClan } from '$lib/api/clans';
  import { describe } from '$lib/api/messages';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';

  // Opening an invite joins the clan, as it did on Hanayo, and lands on the clan's page.
  $effect(() => {
    const code = page.params.code ?? '';
    joinClan(code).then(
      async (joined) => {
        flash.next('success', "You've joined the clan! Hooray!! \\(^o^)/");
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

<svelte:head><title>Joining a clan · RealistikOsu</title></svelte:head>

<main class="wrap">
  <p class="panel empty-note">
    <i class="fa-solid fa-circle-notch fa-spin"></i> Joining the clan...
  </p>
</main>
