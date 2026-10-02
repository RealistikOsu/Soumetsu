<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { pinScore, unpinScore, type ScoreWithBeatmap } from '$lib/api/scores';
  import { songParts } from '$lib/format';
  import Dialog from './Dialog.svelte';

  let {
    score,
    pinned,
    rx,
    open = $bindable(false),
    ondone
  }: {
    score: ScoreWithBeatmap | null;
    pinned: boolean;
    rx: number;
    open?: boolean;
    ondone: () => void;
  } = $props();

  let busy = $state(false);
  let failure = $state<string | null>(null);

  $effect(() => {
    if (open) failure = null;
  });

  async function confirm() {
    if (!score) return;
    busy = true;
    failure = null;
    try {
      await (pinned ? unpinScore(score.id) : pinScore(score.id, rx));
      open = false;
      ondone();
    } catch (error) {
      failure = describe(error);
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open class="pin-dialog">
  <button class="dialog-close" aria-label="Close" onclick={() => (open = false)}>
    <i class="fa-solid fa-xmark"></i>
  </button>
  <h2>{pinned ? 'Unpin this score?' : 'Pin this score?'}</h2>
  {#if score}
    {@const parts = songParts(score.beatmap.song_name)}
    <p class="muted">{parts.song} [{parts.diff}]</p>
  {/if}
  {#if failure}<p class="dialog-note">{failure}</p>{/if}
  <div class="dialog-actions">
    <button
      class="btn {pinned ? 'btn-red' : 'btn-blue'}"
      type="button"
      disabled={busy}
      onclick={confirm}
    >
      {pinned ? 'Unpin score' : 'Pin score'}
    </button>
  </div>
</Dialog>
