import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';

import { fetchChats, type ChatListItem } from './api';

type UseChatsState = {
  chats: ChatListItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

export function useChats(): UseChatsState {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setChats(await fetchChats(user.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить чаты.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Refetch the list whenever a message is inserted anywhere (cheap: one query).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chats-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        load(true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const refresh = useCallback(() => load(true), [load]);

  return { chats, loading, refreshing, error, refresh };
}
