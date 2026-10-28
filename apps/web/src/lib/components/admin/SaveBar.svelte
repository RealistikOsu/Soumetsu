<script lang="ts">
  // Sits at the bottom of the screen while there's something to save. With no onsave, Save submits the form.
  let {
    changes,
    busy,
    ondiscard,
    onsave
  }: { changes: number; busy: boolean; ondiscard: () => void; onsave?: () => void } = $props();
</script>

{#if changes}
  <div class="save-bar">
    <span>{changes} unsaved {changes === 1 ? 'change' : 'changes'}</span>
    <button class="btn" type="button" onclick={ondiscard}>Discard</button>
    <button
      class="btn btn-green"
      type={onsave ? 'button' : 'submit'}
      disabled={busy}
      onclick={onsave}
    >
      <i class="fa-solid fa-floppy-disk"></i>Save
    </button>
  </div>
{/if}
