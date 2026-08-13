import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { blockUser, listBlockedUserIds } from './moderationApi';
import { listStreamMessages, sendStreamMessage, type StreamMessage } from './streamChatApi';

const POLL_MS = 4000;

/** Poll a stream's chat while `enabled`, and expose send/block helpers. stream_chat isn't
 *  realtime-enabled, so we poll (same approach as the website). Messages from users the
 *  current user has blocked are filtered out (Apple 1.2 / Google Play UGC). */
export function useStreamChat(
  streamId: string | null,
  { enabled = true, currentUserId = null }: { enabled?: boolean; currentUserId?: string | null } = {},
) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!streamId) return;
    try {
      const msgs = await listStreamMessages(streamId);
      setMessages(msgs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить чат.');
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    if (!streamId || !enabled) return;
    setLoading(true);
    void refresh();
    timer.current = setInterval(refresh, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [streamId, enabled, refresh]);

  // Load the current user's block list so their messages stay hidden across refreshes.
  useEffect(() => {
    if (!currentUserId) {
      setBlockedIds(new Set());
      return;
    }
    let alive = true;
    listBlockedUserIds(currentUserId)
      .then((ids) => alive && setBlockedIds(new Set(ids)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentUserId]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.owner || !blockedIds.has(m.owner)),
    [messages, blockedIds],
  );

  const send = useCallback(
    async (owner: string, text: string) => {
      if (!streamId) return;
      await sendStreamMessage({ stream: streamId, owner, text });
      await refresh(); // pull immediately so the sender sees their message without waiting a poll
    },
    [streamId, refresh],
  );

  const block = useCallback(
    async (userId: string) => {
      if (!currentUserId || !userId || userId === currentUserId) return;
      await blockUser(currentUserId, userId);
      setBlockedIds((prev) => new Set(prev).add(userId)); // hide their messages immediately
    },
    [currentUserId],
  );

  return { messages: visibleMessages, loading, error, send, refresh, block };
}
