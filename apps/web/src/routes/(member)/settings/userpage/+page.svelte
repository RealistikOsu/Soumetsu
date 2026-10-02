<script lang="ts">
  import { bbcodeBoxes, bbcodeToHtml } from '$lib/bbcode';
  import { describe } from '$lib/api/messages';
  import { myUserpage, saveUserpage } from '$lib/api/settings';
  import { flash } from '$lib/flash.svelte';

  let content = $state('');
  let ready = $state(false);
  let failed = $state(false);
  let busy = $state(false);
  let preview = $state('');
  let timer: ReturnType<typeof setTimeout>;

  $effect(() => {
    myUserpage().then(
      (result) => {
        content = result.content;
        preview = bbcodeToHtml(result.content);
        ready = true;
      },
      () => (failed = true)
    );
  });

  // The preview follows typing, a moment after each pause.
  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => (preview = bbcodeToHtml(content)), 200);
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await saveUserpage(content);
      flash.show('success', 'Your userpage has been saved.');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

{#if failed}
  <p class="panel empty-note">Couldn't load your userpage. Try again in a bit.</p>
{:else}
  <form onsubmit={save}>
    <h2 class="section-title c-pink">
      <i class="fa-solid fa-file-lines"></i>Userpage
      <a href="/doc/bbcode">BBCode syntax reference</a>
    </h2>
    <div class="userpage-editor">
      <div class="panel c-pink">
        <textarea
          bind:value={content}
          oninput={onInput}
          name="data"
          spellcheck="false"
          aria-label="Userpage"
          disabled={!ready}></textarea>
      </div>
      <div class="panel">
        <div class="preview-label">Preview</div>
        <div class="userpage" use:bbcodeBoxes>{@html preview}</div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy || !ready}>Save</button>
    </div>
  </form>
{/if}
