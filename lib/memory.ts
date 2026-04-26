import type { ChatMessage } from "./types";

const MAX_TURNS = 12;

const stores = new Map<string, ChatMessage[]>();

function key(channel: string, userId: string): string {
  return `${channel}:${userId}`;
}

export function getHistory(channel: string, userId: string): ChatMessage[] {
  return stores.get(key(channel, userId)) ?? [];
}

export function appendHistory(
  channel: string,
  userId: string,
  message: ChatMessage
): ChatMessage[] {
  const k = key(channel, userId);
  const history = stores.get(k) ?? [];
  const next = [...history, message].slice(-MAX_TURNS);
  stores.set(k, next);
  return next;
}

export function resetHistory(channel: string, userId: string): void {
  stores.delete(key(channel, userId));
}
