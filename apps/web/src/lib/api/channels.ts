import { getToken } from '$lib/auth/token';
import { siteApi } from './site';

export interface Channel {
  name: string;
  description: string;
}

export interface ChannelList {
  channels: Channel[];
  // The error code for why the player can't post anywhere, or null when they can.
  blocked: string | null;
}

export interface ChannelMessage {
  id: number;
  sender: { id: number; username: string };
  content: string;
  time: string;
}

export interface ChannelPage {
  messages: ChannelMessage[];
  more: boolean;
}

const path = (name: string) => `/channels/${encodeURIComponent(name.replace(/^#/, ''))}`;

export const channels = (signal?: AbortSignal) =>
  siteApi.get<ChannelList>('/channels', undefined, signal);

export const channelHistory = (name: string, before?: number, signal?: AbortSignal) =>
  siteApi.get<ChannelPage>(path(name), before ? { before } : undefined, signal);

export const postToChannel = (name: string, content: string) =>
  siteApi.post<ChannelMessage>(path(name), { content });

// Read by hand like the inbox stream. Calls back with null on every (re)connect, since anything may have been
// said meanwhile, and gives up on a 4xx since retrying won't change the answer.
export async function channelStream(
  name: string,
  onMessage: (message: ChannelMessage | null) => void,
  signal: AbortSignal
) {
  while (!signal.aborted) {
    try {
      const response = await fetch(`/site-api${path(name)}/stream`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        signal
      });
      if (response.status >= 400 && response.status < 500) return;
      if (response.ok && response.body) {
        onMessage(null);
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const events = (buffer + value).split('\n\n');
          buffer = events.pop()!;
          for (const event of events) {
            if (event.startsWith('data: ')) onMessage(JSON.parse(event.slice(6)));
          }
        }
      }
    } catch {
      if (signal.aborted) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}
