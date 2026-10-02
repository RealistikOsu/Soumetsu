<script lang="ts">
  import { inView } from '@soumetsu/ui';
  import { describe } from '$lib/api/messages';
  import { rankRequestStatus, submitRankRequest } from '$lib/api/beatmaps';
  import { mirrorBeatmap, mirrorSet, type MirrorSet } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';
  import { coverUrl } from '$lib/assets';
  import { mirrorStatusKey, starColour } from '$lib/beatmaps';
  import Banner from '$lib/components/Banner.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  interface Link {
    set?: number;
    map?: number;
    text: string;
  }

  const bySet = (match: RegExpMatchArray): Link => ({
    set: +match[1],
    text: m.beatmaps_request_link_set({ set: match[1] })
  });
  const byDiff = (match: RegExpMatchArray): Link => ({
    map: +match[1],
    text: m.beatmaps_request_link_whole_set({ diff: match[1] })
  });

  // The links the game server accepts, and what each one means.
  const patterns: [RegExp, (match: RegExpMatchArray) => Link][] = [
    [
      /^https?:\/\/osu\.ppy\.sh\/beatmapsets\/(\d+)#\w+\/(\d+)$/,
      (match) => ({
        set: +match[1],
        text: m.beatmaps_request_link_set_from_diff({ set: match[1], diff: match[2] })
      })
    ],
    [/^https?:\/\/osu\.ppy\.sh\/beatmapsets\/(\d+)\/?$/, bySet],
    [/^https?:\/\/osu\.ppy\.sh\/s\/(\d+)$/, bySet],
    [/^https?:\/\/osu\.ppy\.sh\/b\/(\d+)$/, byDiff],
    [/^https?:\/\/ussr\.pl\/(?:b|beatmaps)\/(\d+)$/, byDiff],
    [/^https?:\/\/ussr\.pl\/s\/(\d+)$/, bySet]
  ];

  let link = $state('');
  let sending = $state(false);
  let preview = $state.raw<MirrorSet | null>(null);
  const status = query((signal) => rankRequestStatus(signal));

  const value = $derived(link.trim());
  const hit = $derived.by(() => {
    for (const [pattern, read] of patterns) {
      const match = value.match(pattern);
      if (match) return read(match);
    }
    return null;
  });

  $effect(() => {
    const target = hit;
    preview = null;
    if (!target) return;
    const controller = new AbortController();
    const setId = target.set
      ? Promise.resolve(target.set)
      : mirrorBeatmap(target.map!, controller.signal).then((b) => b.set_id);
    setId
      .then((id) => mirrorSet(id, controller.signal))
      .then(
        (set) => {
          if (!controller.signal.aborted) preview = set;
        },
        () => null
      );
    return () => controller.abort();
  });

  async function send(event: SubmitEvent) {
    event.preventDefault();
    if (!hit) return;
    sending = true;
    try {
      await submitRankRequest(value);
      flash.show('success', m.beatmaps_request_sent());
      link = '';
      status.reload();
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      sending = false;
    }
  }

  const data = $derived(status.state.status === 'ready' ? status.state.data : null);
  const sorted = $derived(
    preview ? preview.beatmaps.toSorted((a, b) => a.difficulty_rating - b.difficulty_rating) : []
  );
</script>

<svelte:head><title>{m.beatmaps_request_title()} · RealistikOsu</title></svelte:head>

<Banner image="rank-request.jpg">
  <div>
    <h1>{m.beatmaps_request_title()}</h1>
    <p class="sub">{m.beatmaps_request_sub()}</p>
  </div>
</Banner>

<main class="wrap request">
  <div>
    <SectionTitle colour="c-orange" icon="fa-angles-up"
      >{m.beatmaps_request_send_title()}</SectionTitle
    >
    <form class="panel request-form c-orange" onsubmit={send}>
      <div class="field">
        <label for="beatmap">{m.beatmaps_request_link_label()}</label>
        <div class="link-input">
          <i class="fa-solid fa-link"></i>
          <input
            id="beatmap"
            type="url"
            bind:value={link}
            placeholder="https://osu.ppy.sh/beatmapsets/..."
            required
          />
        </div>
        {#if !value}
          <small>{m.beatmaps_request_hint()}</small>
        {:else if hit}
          <small class="ok"><i class="fa-solid fa-circle-check"></i>{hit.text}</small>
        {:else}
          <small class="error">
            <i class="fa-solid fa-circle-xmark"></i>{m.beatmaps_request_bad_link()}
          </small>
        {/if}
      </div>

      {#if preview}
        {@const look = mirrorStatusKey(preview.status)}
        <div class="request-preview">
          <img src={coverUrl(preview.id, 'list')} alt="" />
          <div>
            <b>{preview.title}</b>
            <span class="muted">{preview.artist} · {m.beatmaps_mapped_by()} {preview.creator}</span>
            <span class="map-diffs">
              <span class="dots">
                {#each sorted as d (d.id)}
                  <span
                    style="background: {starColour(d.difficulty_rating)}"
                    title="{d.version} · {d.difficulty_rating.toFixed(2)}★"
                  ></span>
                {/each}
              </span>
              <span class="faint"
                >{m.beatmaps_request_difficulty_count({ count: sorted.length })}</span
              >
            </span>
          </div>
          <span class="map-status {look.colour}"
            ><i class="fa-solid {look.icon}"></i>{look.name}</span
          >
        </div>
      {/if}

      <button
        class="btn btn-orange"
        type="submit"
        disabled={sending || !hit || data?.can_submit === false}
      >
        <i class="fa-solid fa-paper-plane"></i>{m.beatmaps_request_send()}
      </button>
    </form>
  </div>

  <aside>
    <SectionTitle colour="c-yellow" icon="fa-inbox">{m.beatmaps_request_queue()}</SectionTitle>
    <div class="panel queue c-yellow">
      {#if data}
        <div class="meter">
          <div class="meter-head">
            <span>{m.beatmaps_request_queue_day()}</span><b>{data.submitted} / {data.queue_size}</b>
          </div>
          <div class="level-bar" use:inView>
            <span style="width: {(data.submitted / data.queue_size) * 100}%"></span>
          </div>
        </div>
        {#if data.max_per_user}
          <div class="meter">
            <div class="meter-head">
              <span>{m.beatmaps_request_queue_mine()}</span><b
                >{data.submitted_by_user ?? 0} / {data.max_per_user}</b
              >
            </div>
            <div class="level-bar mine" use:inView>
              <span style="width: {((data.submitted_by_user ?? 0) / data.max_per_user) * 100}%"
              ></span>
            </div>
          </div>
          <p class="faint">
            {m.beatmaps_request_queue_note({ max: data.max_per_user })}
          </p>
        {/if}
      {:else if status.state.status === 'error'}
        <p class="empty-note">{m.beatmaps_request_queue_error()}</p>
      {:else}
        <span class="skel" style="width: 100%"></span>
      {/if}
    </div>

    <SectionTitle colour="c-blue" icon="fa-circle-info"
      >{m.beatmaps_request_formats_title()}</SectionTitle
    >
    <ul class="panel link-formats c-blue">
      <li><code>osu.ppy.sh/beatmapsets/<em>set</em></code></li>
      <li><code>osu.ppy.sh/beatmapsets/<em>set</em>#osu/<em>diff</em></code></li>
      <li>
        <code>osu.ppy.sh/s/<em>set</em></code>
        {m.beatmaps_request_formats_or()}
        <code>osu.ppy.sh/b/<em>diff</em></code>
      </li>
      <li><code>ussr.pl/beatmaps/<em>diff</em></code></li>
      <li class="formats-note">
        <i class="fa-solid fa-layer-group"></i>{m.beatmaps_request_formats_note()}
      </li>
    </ul>
  </aside>
</main>
