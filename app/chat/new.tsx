import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import {
  createGroupChat,
  findOrCreateDirectChat,
  searchUsers,
  type UserSearchResult,
} from '@/features/chats/api';
import { errorMessage } from '@/lib/errors';

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
              <Text style={styles.selectedChipText}>{u.name || u.email}</Text>
              <Ionicons name="close" size={14} color="#2563eb" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {isGroup ? (
        <TextInput
          style={styles.input}
          value={groupTitle}
          onChangeText={setGroupTitle}
          placeholder="Название группы"
          placeholderTextColor="#9ca3af"
        />
      ) : null}

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Имя или email"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

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
                  <Text style={styles.avatarInitial}>
                    {(item.name || item.email)[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={styles.rowBody}>
                <Text style={styles.name}>{item.name || 'Без имени'}</Text>
                <Text style={styles.email} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
              <Ionicons
                name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={checked ? '#2563eb' : '#cbd5e1'}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.hint}>
            {searching ? (
              <ActivityIndicator />
            ) : query.trim().length >= 2 ? (
              <Text style={styles.muted}>Никого не найдено</Text>
            ) : (
              <Text style={styles.muted}>Введите имя или email (от 2 символов)</Text>
            )}
          </View>
        }
      />

      {selected.length > 0 ? (
        <Pressable
          style={[styles.createButton, opening && styles.disabled]}
          onPress={handleCreate}
          disabled={opening}
        >
          {opening ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createText}>
              {isGroup ? `Создать группу (${selected.length})` : 'Написать'}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  selectedChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563eb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  email: {
    fontSize: 13,
    color: '#6b7280',
  },
  hint: {
    alignItems: 'center',
    paddingTop: 40,
  },
  muted: {
    fontSize: 15,
    color: '#9ca3af',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  createText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
