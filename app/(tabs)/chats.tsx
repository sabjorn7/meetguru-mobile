import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { AppText, PillButton } from '@/components/ui';
import { deleteChat, type ChatListItem } from '@/features/chats/api';
import { useChats } from '@/features/chats/useChats';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

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

function ChatRow({
  chat,
  onPress,
  onLongPress,
}: {
  chat: ChatListItem;
  onPress: (c: ChatListItem) => void;
  onLongPress: (c: ChatListItem) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(chat)}
      onLongPress={() => onLongPress(chat)}
    >
      {chat.photo ? (
        <Image source={{ uri: chat.photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <AppText variant="subtitle" style={{ color: colors.faint }}>
            {chat.title[0]?.toUpperCase() ?? '?'}
          </AppText>
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <AppText
            variant={chat.unread ? 'subtitle' : 'bodyMedium'}
            style={styles.title}
            numberOfLines={1}
          >
            {chat.title}
          </AppText>
          <AppText variant="label" style={{ color: colors.faint }}>
            {formatWhen(chat.lastMessageAt)}
          </AppText>
        </View>
        <View style={styles.rowHeader}>
          <AppText
            variant="caption"
            style={[styles.preview, chat.unread && { color: colors.ink }]}
            numberOfLines={1}
          >
            {chat.lastMessageText ?? 'Нет сообщений'}
          </AppText>
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
      router.push({
        pathname: '/chat/[id]',
        params: { id: chat.id, title: chat.title, isGroup: chat.isGroup ? '1' : '' },
      });
    },
    [router],
  );

  const confirmDelete = useCallback(
    (chat: ChatListItem) => {
      Alert.alert('Удалить чат?', `«${chat.title}» будет удалён у всех участников.`, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chat.id);
              refresh();
            } catch (e) {
              Alert.alert('Ошибка', errorMessage(e, 'Не удалось удалить чат.'));
            }
          },
        },
      ]);
    },
    [refresh],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <AppText variant="body" style={{ color: colors.danger, textAlign: 'center' }}>
          {error}
        </AppText>
        <PillButton label="Повторить" onPress={refresh} style={{ paddingHorizontal: spacing.xxl }} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={chats}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatRow chat={item} onPress={openChat} onLongPress={confirmDelete} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <AppText variant="body" style={{ color: colors.muted }}>
          У вас пока нет чатов
        </AppText>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.card,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.bg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
