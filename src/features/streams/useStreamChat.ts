import { useCallback, useEffect, useRef, useState } from 'react';

import { listStreamMessages, sendStreamMessage, type StreamMessage } from './streamChatApi';

const POLL_MS = 4000;

/** Poll a stream's chat while `enabled`, and expose a send helper. stream_chat isn't
 *  realtime-enabled, so we poll (same approach as the website). */
export function useStreamChat(streamId: string | null, { enabled = true }: { enabled?: boolean } = {}) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
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

  const send = useCallback(
    async (owner: string, text: string) => {
      if (!streamId) return;
      await sendStreamMessage({ stream: streamId, owner, text });
      await refresh(); // pull immediately so the sender sees their message without waiting a poll
    },
    [streamId, refresh],
  );

  return { messages, loading, error, send, refresh };
}
