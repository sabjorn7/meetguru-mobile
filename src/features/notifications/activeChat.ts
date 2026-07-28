/**
 * The chat the user is currently viewing, if any. Used by the foreground
 * notification handler to suppress a push for the chat that's already open.
 */
let activeChatId: string | null = null;

export function setActiveChat(chatId: string | null) {
  activeChatId = chatId;
}

export function getActiveChat(): string | null {
  return activeChatId;
}
