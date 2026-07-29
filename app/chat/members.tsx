import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { fetchChatMembers, type ChatMember } from '@/features/chats/api';
import { roleLabel } from '@/features/profile/api';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

export default function ChatMembersScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string; title?: string }>();
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!chatId) return;
    fetchChatMembers(chatId)
      .then((data) => mounted && setMembers(data))
      .catch((e) => mounted && setError(errorMessage(e, 'Не удалось загрузить участников.')))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [chatId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Участники' }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Участники · ${members.length}` }} />
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.photo ? (
              <Image source={{ uri: item.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <AppText variant="subtitle" style={{ color: colors.faint }}>
                  {(item.name || item.email)[0]?.toUpperCase() ?? '?'}
                </AppText>
              </View>
            )}
            <View style={styles.body}>
              <AppText variant="subtitle">{item.name || 'Без имени'}</AppText>
              <AppText variant="caption" numberOfLines={1}>
                {item.role ? `${roleLabel(item.role)} · ` : ''}
                {item.email}
              </AppText>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: 76,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    padding: 16,
  },
});
