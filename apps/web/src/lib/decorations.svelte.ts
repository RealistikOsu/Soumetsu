import { siteApi } from '$lib/api/site';

class DecorationStore {
  keys = $state<Record<number, string>>({});
  #requested = new Set<number>();
  #queue = new Set<number>();
  #timer: ReturnType<typeof setTimeout> | undefined;

  want(id: number) {
    if (this.#requested.has(id)) return;
    this.#requested.add(id);
    this.#queue.add(id);
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#flush(), 30);
  }

  async #flush() {
    const ids = [...this.#queue];
    this.#queue.clear();
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const found = await siteApi.post<Record<number, string>>('/decorations', { ids: batch });
      for (const id of batch) this.keys[id] = found[id] ?? '';
    }
  }
}

export const decorationStore = new DecorationStore();
