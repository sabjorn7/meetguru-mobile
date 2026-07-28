import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { fetchChatMembers, type ChatMember } from '@/features/chats/api';
import { roleLabel } from '@/features/profile/api';
import { errorMessage } from '@/lib/errors';

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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.photo ? (
              <Image source={{ uri: item.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(item.name || item.email)[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View style={styles.body}>
              <Text style={styles.name}>{item.name || 'Без имени'}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {item.role ? `${roleLabel(item.role)} · ` : ''}
                {item.email}
              </Text>
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
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  body: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sub: {
    fontSize: 13,
    color: '#6b7280',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 76,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    padding: 16,
  },
});
