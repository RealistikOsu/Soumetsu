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
