import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';

import {
  fetchMessages,
  markChatRead,
  sendMessage,
  type ChatMessage,
} from './api';

/** A message plus its delivery status for optimistic rendering. */
export type DisplayMessage = ChatMessage & {
  mine: boolean;
  status: 'sent' | 'sending' | 'failed';
};

type UseConversationState = {
  messages: DisplayMessage[];
  loading: boolean;
  error: string | null;
  send: (text: string) => void;
};

export function useConversation(chatId: string | undefined): UseConversationState {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toDisplay = useCallback(
    (m: ChatMessage, status: DisplayMessage['status'] = 'sent'): DisplayMessage => ({
      ...m,
      mine: m.creatorId === userId,
      status,
    }),
    [userId],
  );

  // Initial load + mark read.
  useEffect(() => {
    let mounted = true;
    if (!chatId) return;
    setLoading(true);
    setError(null);
    fetchMessages(chatId)
      .then((msgs) => {
        if (!mounted) return;
        setMessages(msgs.map((m) => toDisplay(m)));
        if (userId) markChatRead(chatId, userId).catch(() => {});
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : 'Не удалось загрузить сообщения.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [chatId, userId, toDisplay]);

  // Realtime: append messages inserted into this chat (deduped by id).
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat=eq.${chatId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            text: string | null;
            created_at: string;
            creator: string | null;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const incoming = toDisplay({
              id: row.id,
              text: row.text ?? '',
              createdAt: row.created_at,
              creatorId: row.creator,
              authorName: null,
              authorPhoto: null,
            });
            // Others' messages arriving live mean we've now seen them.
            if (!incoming.mine && userId) markChatRead(chatId, userId).catch(() => {});
            return [...prev, incoming];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, userId, toDisplay]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !chatId || !userId) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: DisplayMessage = {
        id: tempId,
        text: trimmed,
        createdAt: new Date().toISOString(),
        creatorId: userId,
        authorName: null,
        authorPhoto: null,
        mine: true,
        status: 'sending',
      };
      setMessages((prev) => [...prev, optimistic]);

      sendMessage(chatId, trimmed, userId, null)
        .then((realId) => {
          setMessages((prev) => {
            // Realtime may have already appended the real row — drop the temp then.
            if (prev.some((m) => m.id === realId)) {
              return prev.filter((m) => m.id !== tempId);
            }
            return prev.map((m) => (m.id === tempId ? { ...m, id: realId, status: 'sent' } : m));
          });
        })
        .catch(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
          );
        });
    },
    [chatId, userId],
  );

  return { messages, loading, error, send };
}
