import { getToken } from '$lib/auth/token';
import { siteApi } from './site';

export interface ChatMessage {
  id: number;
  from: number;
  content: string;
  time: number;
}

export interface Conversation {
  peer: { id: number; username: string; country: string };
  last: ChatMessage;
  unread: number;
}

export interface Thread {
  messages: ChatMessage[];
  more: boolean;
  // How far the other player has read, so the newest of your messages can say it was seen.
  peerReadId: number;
}

export const conversations = (signal?: AbortSignal) =>
  siteApi.get<Conversation[]>('/messages', undefined, signal);

export const thread = (peer: number, before?: number, signal?: AbortSignal) =>
  siteApi.get<Thread>(`/messages/${peer}`, before ? { before } : undefined, signal);

export const sendMessage = (peer: number, content: string) =>
  siteApi.post<ChatMessage>(`/messages/${peer}`, { content });

export const unreadMessages = (signal?: AbortSignal) =>
  siteApi.get<number>('/messages/unread', undefined, signal);

export const reportMessage = (message: number, reason: string) =>
  siteApi.post('/messages/reports', { message, reason });

// Server-sent events, read by hand because EventSource can't send the bearer token. It calls back with the
// sender of each new message, and with null on every (re)connect since anything may have arrived meanwhile.
export async function listen(onMessage: (peer: number | null) => void, signal: AbortSignal) {
  while (!signal.aborted) {
    try {
      const response = await fetch('/site-api/messages/stream', {
        headers: { Authorization: `Bearer ${getToken()}` },
        signal
      });
      if (response.status === 401) return;
      onMessage(null);
      const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const events = (buffer + value).split('\n\n');
        buffer = events.pop()!;
        for (const event of events) {
          if (event.startsWith('data: ')) onMessage(Number(event.slice(6)));
        }
      }
    } catch {
      if (signal.aborted) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}
