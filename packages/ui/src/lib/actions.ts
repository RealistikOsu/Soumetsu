import type { Action } from 'svelte/action';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Adds .in-view the first time the element scrolls into view, which the chart and bar animations wait for.
export const inView: Action<HTMLElement> = (node) => {
  if (reducedMotion()) {
    node.classList.add('in-view');
    return;
  }
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      node.classList.add('in-view');
      observer.disconnect();
    },
    { rootMargin: '0px 0px -8% 0px' }
  );
  observer.observe(node);
  return { destroy: () => observer.disconnect() };
};

// One highlight that slides to whichever tab is active.
export const tabInk: Action<HTMLElement> = (tabs) => {
  const place = () => {
    const active = tabs.querySelector<HTMLElement>(':scope > a.active');
    let ink = tabs.querySelector<HTMLElement>(':scope > .tab-ink');
    if (!active) {
      if (ink) ink.hidden = true;
      return;
    }
    if (!ink) {
      ink = document.createElement('span');
      ink.className = 'tab-ink';
      tabs.prepend(ink);
      tabs.classList.add('has-ink');
    }
    ink.hidden = !tabs.offsetParent;
    if (ink.hidden) return;
    const accent = getComputedStyle(active).getPropertyValue('--accent').trim();
    ink.style.left = `${active.offsetLeft}px`;
    ink.style.width = `${active.offsetWidth}px`;
    ink.style.background =
      tabs.classList.contains('tinted') && accent
        ? `color-mix(in srgb, ${accent} 16%, transparent)`
        : '';
  };

  place();
  const ready = requestAnimationFrame(() => tabs.classList.add('ink-ready'));
  const mutations = new MutationObserver(place);
  mutations.observe(tabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', place);
  // Counts and labels that load in after mount change a tab's width.
  const sizes = new ResizeObserver(place);
  for (const tab of tabs.querySelectorAll(':scope > a')) sizes.observe(tab);

  return {
    destroy() {
      cancelAnimationFrame(ready);
      mutations.disconnect();
      sizes.disconnect();
      removeEventListener('resize', place);
    }
  };
};

// Images fade in once loaded; css/motion.css hides lazy images and avatars until they carry .loaded.
export function fadeImages() {
  const mark = (event: Event) => {
    if (event.target instanceof HTMLImageElement) event.target.classList.add('loaded');
  };
  document.addEventListener('load', mark, true);
  document.addEventListener('error', mark, true);
  return () => {
    document.removeEventListener('load', mark, true);
    document.removeEventListener('error', mark, true);
  };
}

// Images that finished loading before the listener was attached never fire a load event.
export const loadedImage: Action<HTMLElement> = (node) => {
  const mark = () => {
    for (const img of node.querySelectorAll('img')) if (img.complete) img.classList.add('loaded');
  };
  mark();
  const mutations = new MutationObserver(mark);
  mutations.observe(node, { childList: true, subtree: true });
  return { destroy: () => mutations.disconnect() };
};
