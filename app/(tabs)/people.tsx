import { useRouter } from 'expo-router';
import { useCallback } from 'react';
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

import { CatalogFilter } from '@/components/CatalogFilter';
import { useCatalogFilter } from '@/components/useCatalogFilter';
import type { ProfileListItem } from '@/features/profile/api';
import { usePeople } from '@/features/profile/usePeople';

function PersonRow({
  person,
  onPress,
}: {
  person: ProfileListItem;
  onPress: (p: ProfileListItem) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(person)}
    >
      {person.photo ? (
        <Image source={{ uri: person.photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {(person.name || '?')[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name || 'Без имени'}
        </Text>
        {person.role ? <Text style={styles.role}>{person.role}</Text> : null}
        {person.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {person.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PeopleScreen() {
  const { people, loading, refreshing, error, refresh } = usePeople();
  const router = useRouter();

  const { query, setQuery, selectedCategory, setSelectedCategory, categories, filtered } =
    useCatalogFilter({
      items: people,
      getTitle: (p) => p.name,
      getCategory: (p) => p.role,
    });

  const openPerson = useCallback(
    (person: ProfileListItem) => router.push(`/user/${person.id}`),
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
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PersonRow person={item} onPress={openPerson} />}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <CatalogFilter
          query={query}
          onQuery={setQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          placeholder="Поиск по имени"
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Профили не найдены</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  body: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  role: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
  },
  separator: {
    height: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
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
