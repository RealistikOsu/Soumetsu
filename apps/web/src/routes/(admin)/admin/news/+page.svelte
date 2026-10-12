<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { deleteNews, publishNews, saveNews, staffNews, uploadNewsCover } from '$lib/api/news';
  import { query } from '$lib/api/query.svelte';
  import AdminDialog from '$lib/components/admin/AdminDialog.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { renderDoc } from '$lib/docs/render';
  import { flash } from '$lib/flash.svelte';
  import { dateTime, fromIso } from '$lib/format';
  import { PREVIEW_MAX, slugify, type StaffPost } from '$lib/news';

  type Draft = {
    previous: string | null;
    isNew: boolean;
    published: boolean;
    slug: string;
    slugEdited: boolean;
    title: string;
    preview: string;
    body: string;
    cover: string | null;
  };

  let version = $state(0);
  const list = query((signal) => {
    void version;
    return staffNews(signal);
  });

  let editing = $state<Draft | null>(null);
  let deleting = $state<StaffPost | null>(null);
  let cover = $state<File | null>(null);
  let busy = $state(false);

  const html = $derived(editing ? renderDoc(editing.body).html : '');
  const slug = $derived(
    editing ? (editing.slugEdited ? editing.slug : slugify(editing.title)) : ''
  );

  function open(post: StaffPost | null) {
    cover = null;
    editing = post
      ? {
          previous: post.slug,
          isNew: false,
          published: post.publishedAt !== null,
          slug: post.slug,
          slugEdited: true,
          title: post.title,
          preview: post.preview,
          body: post.body,
          cover: post.cover
        }
      : {
          previous: null,
          isNew: true,
          published: false,
          slug: '',
          slugEdited: false,
          title: '',
          preview: '',
          body: '',
          cover: null
        };
  }

  async function run(action: () => Promise<unknown>, success: string) {
    busy = true;
    try {
      await action();
      flash.show('success', success);
      version++;
      editing = null;
      deleting = null;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }

  async function store(draft: Draft) {
    const saved = await saveNews(slug, {
      title: draft.title,
      preview: draft.preview,
      body: draft.body,
      previous: draft.previous ?? undefined,
      create: draft.isNew || undefined
    });
    // Later steps can fail, so keep the open draft and the list in step with what is on disk.
    draft.previous = saved.slug;
    draft.slug = saved.slug;
    draft.slugEdited = true;
    draft.isNew = false;
    version++;
    if (cover) await uploadNewsCover(saved.slug, cover);
    return saved;
  }

  const save = (draft: Draft) => run(() => store(draft), 'Post saved.');
  const publish = (draft: Draft) =>
    run(async () => publishNews((await store(draft)).slug), 'Post published.');
</script>

<AdminHead heading="News" text="Posts shown on /news, the home page and in lazer.">
  {#snippet extra()}
    <button class="btn btn-blue head-action" type="button" onclick={() => open(null)}>
      <i class="fa-solid fa-plus"></i>New post
    </button>
  {/snippet}
</AdminHead>

<div class="table-wrap">
  {#if list.state.status === 'ready'}
    {#if list.state.data.length}
      <table class="board admin-table c-blue">
        <thead>
          <tr><th>Title</th><th>State</th><th>Updated</th><th></th></tr>
        </thead>
        <tbody>
          {#each list.state.data as post (post.slug)}
            <tr>
              <td><b>{post.title}</b> <small><code>{post.slug}</code></small></td>
              <td>{post.publishedAt ? 'Published' : 'Draft'}</td>
              <td>{post.updatedAt ? dateTime(fromIso(post.updatedAt)) : '–'}</td>
              <td class="actions">
                <button class="btn btn-small" type="button" onclick={() => open(post)}>
                  <i class="fa-solid fa-pen"></i>Edit
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="Delete {post.title}"
                  onclick={() => (deleting = post)}
                >
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="empty-note">No posts yet.</p>
    {/if}
  {:else if list.state.status === 'loading'}
    <span class="skel" style="width: 100%; height: 120px"></span>
  {:else}
    <p class="empty-note">{describe(list.state.error)}</p>
  {/if}
</div>

<AdminDialog
  bind:open={
    () => editing !== null,
    (value) => {
      if (!value) editing = null;
    }
  }
  title={editing?.previous ? 'Edit post' : 'New post'}
  colour="c-blue"
  size="wide"
>
  {#if editing}
    <div class="field">
      <label for="news-title">Title</label>
      <input id="news-title" bind:value={editing.title} />
    </div>
    <div class="field">
      <label for="news-slug">Link</label>
      <input
        id="news-slug"
        value={slug}
        disabled={editing.published}
        oninput={(e) => {
          if (!editing) return;
          editing.slug = e.currentTarget.value;
          editing.slugEdited = true;
        }}
      />
      <small>
        ussr.pl/news/{slug || '…'}{#if editing.published}. Fixed now the post is out.{/if}
      </small>
    </div>
    <div class="field">
      <label for="news-preview">Preview</label>
      <textarea id="news-preview" rows="2" maxlength={PREVIEW_MAX} bind:value={editing.preview}
      ></textarea>
      <small>{editing.preview.length}/{PREVIEW_MAX}</small>
    </div>
    <div class="field">
      <label for="news-cover">Cover</label>
      <input
        id="news-cover"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onchange={(e) => (cover = e.currentTarget.files?.[0] ?? null)}
      />
      <small>
        {cover ? cover.name : (editing.cover ?? 'None')}. JPEG, PNG or WebP, up to 5 MB.
      </small>
    </div>
    <div class="field">
      <label for="news-body">Body</label>
      <textarea id="news-body" rows="14" bind:value={editing.body}></textarea>
      <small>Markdown, same as the docs.</small>
    </div>
    <div class="panel doc-body">{@html html}</div>
  {/if}
  {#snippet footer()}
    <button class="btn" type="button" onclick={() => (editing = null)}>Cancel</button>
    <button
      class="btn"
      type="button"
      disabled={busy || !editing?.title.trim()}
      onclick={() => editing && save(editing)}
    >
      Save{editing?.published ? '' : ' draft'}
    </button>
    {#if editing && !editing.published}
      <button
        class="btn btn-blue"
        type="button"
        disabled={busy || !editing.title.trim()}
        onclick={() => editing && publish(editing)}
      >
        Publish
      </button>
    {/if}
  {/snippet}
</AdminDialog>

<AdminDialog
  bind:open={
    () => deleting !== null,
    (value) => {
      if (!value) deleting = null;
    }
  }
  title="Delete post"
  colour="c-red"
>
  {#if deleting}
    <p>Delete <b>{deleting.title}</b>? It disappears from the site and lazer straight away.</p>
  {/if}
  {#snippet footer()}
    <button class="btn" type="button" onclick={() => (deleting = null)}>Cancel</button>
    <button
      class="btn btn-red"
      type="button"
      disabled={busy}
      onclick={() => deleting && run(() => deleteNews(deleting!.slug), 'Post deleted.')}
    >
      Delete post
    </button>
  {/snippet}
</AdminDialog>
