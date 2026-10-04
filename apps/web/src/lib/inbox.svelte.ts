import { unreadMessages } from '$lib/api/chat';

type Listener = (peer: number | null) => void;

// The header's unread count. The messages page refreshes it after reading a conversation.
class Inbox {
  unread = $state(0);
  #listeners: Listener[] = [];

  async refresh() {
    this.unread = await unreadMessages().catch(() => this.unread);
  }

  // A null peer means the stream just connected, so anything could be new.
  notify(peer: number | null) {
    this.refresh();
    for (const listener of this.#listeners) listener(peer);
  }

  on(listener: Listener) {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter((other) => other !== listener);
    };
  }
}

export const inbox = new Inbox();
