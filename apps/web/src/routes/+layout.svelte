<script lang="ts">
  import { fadeImages } from '@soumetsu/ui';
  import { onMount, type Snippet } from 'svelte';
  import { afterNavigate, onNavigate } from '$app/navigation';
  import FloatTip from '$lib/components/FloatTip.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import Header from '$lib/components/Header.svelte';
  import UserCards from '$lib/components/UserCards.svelte';
  import LoadBar from '$lib/components/LoadBar.svelte';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import { getLocale } from '$lib/i18n';
  import { reducedMotion } from '$lib/motion';
  import { site } from '$lib/site.svelte';
  import '../styles/index.css';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    document.documentElement.lang = getLocale();
    session.start();
    site.load();
    const refresh = setInterval(() => site.load(), 60_000);
    const stopFading = fadeImages();
    return () => {
      clearInterval(refresh);
      stopFading();
    };
  });

  afterNavigate(() => flash.navigated());

  onNavigate((navigation) => {
    if (!document.startViewTransition || reducedMotion()) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  // The clicked beatmap card's cover morphs into the beatmap page's banner.
  function nameCover(event: MouseEvent) {
    const link = (event.target as Element).closest('a[href]');
    const cover = link?.closest('.map-card')?.querySelector<HTMLElement>('.map-cover');
    if (cover) cover.style.viewTransitionName = 'map-cover';
  }
</script>

<svelte:window onclickcapture={nameCover} />

<Header />
{@render children()}
<Footer />
<LoadBar />
<FloatTip />
<UserCards />
