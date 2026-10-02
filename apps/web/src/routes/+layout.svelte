<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { afterNavigate, onNavigate } from '$app/navigation';
  import Footer from '$lib/components/Footer.svelte';
  import Header from '$lib/components/Header.svelte';
  import LoadBar from '$lib/components/LoadBar.svelte';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import { reducedMotion } from '$lib/motion';
  import '../styles/index.css';

  let { children }: { children: Snippet } = $props();

  onMount(() => session.start());

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
