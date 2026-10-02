<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { comments, deleteComment, postComment, type Comment } from '$lib/api/users';
  import { canManageUsers } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { fullDate } from '$lib/format';
  import { flash } from '$lib/flash.svelte';
  import Avatar from './Avatar.svelte';

  let {
    profileId,
    disabled,
    total = $bindable(0)
  }: {
    profileId: number;
    disabled: boolean;
    total?: number;
  } = $props();

  const LIMIT = 10;

  let items = $state.raw<Comment[]>([]);
  let page = $state(0);
  let more = $state(false);
  let loading = $state(true);
  let failed = $state(false);
  let text = $state('');
  let posting = $state(false);

  async function load() {
    loading = true;
    try {
      const rows = await comments(profileId, page + 1);
      items = [...items, ...rows];
      page += 1;
      more = rows.length === LIMIT;
      failed = false;
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!disabled) load();
  });

  async function post(event: SubmitEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    posting = true;
    try {
      const created = await postComment(profileId, message);
      items = [created, ...items];
      total += 1;
      text = '';
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      posting = false;
    }
  }

  async function remove(comment: Comment) {
    try {
      await deleteComment(comment.id);
      items = items.filter((c) => c.id !== comment.id);
      total -= 1;
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  const canDelete = (comment: Comment) =>
    !!session.user &&
    (session.user.id === comment.author_id || canManageUsers(session.user.privileges));
</script>

{#if disabled}
  <div class="panel c-teal">
    <p class="empty-note"><i class="fa-solid fa-lock"></i> This user has disabled comments!</p>
  </div>
{:else}
  <div class="panel c-teal">
    {#if session.user}
      <form class="comment-form" onsubmit={post}>
        <input
          type="text"
          bind:value={text}
          placeholder="Write a comment"
          aria-label="Comment"
          maxlength="380"
        />
        <button class="btn btn-blue" type="submit" disabled={posting || !text.trim()}>Post</button>
      </form>
    {:else}
      <p class="empty-note"><i class="fa-solid fa-lock"></i> Please log in to submit a comment!</p>
    {/if}
    <ul class="comments">
      {#each items as comment (comment.id)}
        <li>
          <a href="/users/{comment.author_id}"><Avatar id={comment.author_id} /></a>
          <div>
            <b>{comment.author_username}</b>
            <time>{fullDate(comment.created_at)}</time>
            {#if canDelete(comment)}
              <button
                class="comment-delete"
                type="button"
                title="Delete comment"
                onclick={() => remove(comment)}
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            {/if}
            <p>{comment.message}</p>
          </div>
        </li>
      {/each}
    </ul>
    {#if loading}
      <p class="empty-note"><span class="skel" style="width: 120px"></span></p>
    {:else if failed}
      <p class="empty-note">Couldn't load the comments. Try again in a bit.</p>
    {:else if items.length === 0}
      <p class="empty-note">No comments yet.</p>
    {:else if more}
      <button class="btn load-more" type="button" onclick={load}>Load more</button>
    {/if}
  </div>
{/if}
