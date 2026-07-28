import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ChatListItem } from '@/features/chats/api';
import { useChats } from '@/features/chats/useChats';

const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const now = new Date();
  const sameDay = parsed.toDateString() === now.toDateString();
  return sameDay ? timeFormatter.format(parsed) : dateFormatter.format(parsed);
}

function ChatRow({ chat, onPress }: { chat: ChatListItem; onPress: (c: ChatListItem) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(chat)}
    >
      {chat.photo ? (
        <Image source={{ uri: chat.photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{chat.title[0]?.toUpperCase() ?? '?'}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={[styles.title, chat.unread && styles.titleUnread]} numberOfLines={1}>
            {chat.title}
          </Text>
          <Text style={styles.when}>{formatWhen(chat.lastMessageAt)}</Text>
        </View>
        <View style={styles.rowHeader}>
          <Text style={[styles.preview, chat.unread && styles.previewUnread]} numberOfLines={1}>
            {chat.lastMessageText ?? 'Нет сообщений'}
          </Text>
          {chat.unread ? <View style={styles.unreadDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  const { chats, loading, refreshing, error, refresh } = useChats();
  const router = useRouter();

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  const openChat = useCallback(
    (chat: ChatListItem) => {
      router.push({ pathname: '/chat/[id]', params: { id: chat.id, title: chat.title } });
    },
    [router],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChatRow chat={item} onPress={openChat} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListEmptyComponent={<Text style={styles.emptyText}>У вас пока нет чатов</Text>}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: '#f3f4f6',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: '#6b7280',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  titleUnread: {
    fontWeight: '700',
  },
  when: {
    fontSize: 12,
    color: '#9ca3af',
  },
  preview: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
  previewUnread: {
    color: '#111827',
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
