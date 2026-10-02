<script lang="ts">
  import { inView, reducedMotion } from './actions';

  let {
    value,
    decimals = 0,
    prefix = ''
  }: { value: number; decimals?: number; prefix?: string } = $props();

  let shown = $state(0);
  let visible = $state(false);

  const format = (n: number) =>
    n.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  $effect(() => {
    if (!visible || reducedMotion()) {
      shown = value;
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / 900);
      shown = value * (1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  });

  function watch(node: HTMLElement) {
    const stop = inView(node);
    const observer = new MutationObserver(() => (visible = node.classList.contains('in-view')));
    observer.observe(node, { attributes: true, attributeFilter: ['class'] });
    return {
      destroy() {
        observer.disconnect();
        if (stop) stop.destroy?.();
      }
    };
  }
</script>

<span use:watch>{prefix}{format(shown)}</span>
