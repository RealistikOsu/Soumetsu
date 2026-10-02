<script lang="ts">
  import { afterNavigate, beforeNavigate } from '$app/navigation';

  let timer: ReturnType<typeof setTimeout>;

  beforeNavigate(({ willUnload }) => {
    if (willUnload) return;
    timer = setTimeout(() => document.documentElement.classList.add('loading'), 300);
  });

  afterNavigate(() => {
    clearTimeout(timer);
    document.documentElement.classList.remove('loading');
  });
</script>

<div class="load-bar" aria-hidden="true"></div>
