import { unreadMessages } from '$lib/api/chat';

// The header's unread count. The messages page refreshes it after reading a conversation.
class Inbox {
  unread = $state(0);

  async refresh() {
    this.unread = await unreadMessages().catch(() => this.unread);
  }
}

export const inbox = new Inbox();
