<script lang="ts">
  import type { Snippet } from 'svelte';
  import Banner from './Banner.svelte';
  import SectionTitle from './SectionTitle.svelte';

  let {
    image,
    heading,
    sub,
    colour,
    icon,
    title,
    card,
    aside
  }: {
    image: string;
    heading: string;
    sub: string;
    colour: string;
    icon: string;
    title: string;
    card: Snippet;
    aside: Snippet;
  } = $props();
</script>

<svelte:head><title>{heading} · RealistikOsu</title></svelte:head>

<Banner {image}>
  <div>
    <h1>{heading}</h1>
    <p class="sub">{sub}</p>
  </div>
</Banner>

<main class="wrap auth">
  <div>
    <SectionTitle {colour} {icon}>{title}</SectionTitle>
    <div class="panel auth-card {colour}">{@render card()}</div>
  </div>
  <aside class="auth-aside">{@render aside()}</aside>
</main>
