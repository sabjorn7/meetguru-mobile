import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, PillButton, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import {
  createGroupChat,
  findOrCreateDirectChat,
  searchUsers,
  type UserSearchResult,
} from '@/features/chats/api';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

export default function NewChatScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);
  const isGroup = selected.length >= 2;

  useEffect(() => {
    if (!user) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchUsers(term, user.id)
        .then(setResults)
        .catch((e) => setError(errorMessage(e, 'Ошибка поиска.')))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [query, user]);

  function toggle(u: UserSearchResult) {
    setSelected((prev) =>
      prev.some((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u],
    );
  }

  async function handleCreate() {
    if (!user || opening || selected.length === 0) return;
    if (isGroup && groupTitle.trim().length === 0) {
      setError('Введите название группы.');
      return;
    }
    setOpening(true);
    setError(null);
    try {
      let chatId: string;
      let title: string;
      if (isGroup) {
        chatId = await createGroupChat(user.id, selected.map((s) => s.id), groupTitle);
        title = groupTitle.trim();
      } else {
        chatId = await findOrCreateDirectChat(user.id, selected[0].id);
        title = selected[0].name || selected[0].email;
      }
      router.replace({
        pathname: '/chat/[id]',
        params: { id: chatId, title, isGroup: isGroup ? '1' : '' },
      });
    } catch (e) {
      setError(errorMessage(e, 'Не удалось создать чат.'));
      setOpening(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Новый чат' }} />

      {selected.length > 0 ? (
        <View style={styles.selectedRow}>
          {selected.map((u) => (
            <Pressable key={u.id} style={styles.selectedChip} onPress={() => toggle(u)}>
              <AppText variant="label" style={{ color: colors.primary }}>
                {u.name || u.email}
              </AppText>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {isGroup ? (
        <TextField
          value={groupTitle}
          onChangeText={setGroupTitle}
          placeholder="Название группы"
        />
      ) : null}

      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Имя или email"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />

      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const checked = selectedIds.has(item.id);
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => toggle(item)}
            >
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <AppText variant="subtitle" style={{ color: colors.faint }}>
                    {(item.name || item.email)[0]?.toUpperCase() ?? '?'}
                  </AppText>
                </View>
              )}
              <View style={styles.rowBody}>
                <AppText variant="subtitle">{item.name || 'Без имени'}</AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {item.email}
                </AppText>
              </View>
              <Ionicons
                name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={checked ? colors.primary : colors.hairline}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.hint}>
            {searching ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <AppText variant="body" style={{ color: colors.faint }}>
                {query.trim().length >= 2
                  ? 'Никого не найдено'
                  : 'Введите имя или email (от 2 символов)'}
              </AppText>
            )}
          </View>
        }
      />

      {selected.length > 0 ? (
        <PillButton
          label={isGroup ? `Создать группу (${selected.length})` : 'Написать'}
          onPress={handleCreate}
          loading={opening}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  hint: {
    alignItems: 'center',
    paddingTop: 40,
  },
});
