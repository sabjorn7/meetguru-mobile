import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { CatalogFilter } from '@/components/CatalogFilter';
import { AppText, PillButton } from '@/components/ui';
import { useCatalogFilter } from '@/components/useCatalogFilter';
import type { ProfileListItem } from '@/features/profile/api';
import { PersonRow } from '@/features/profile/PersonRow';
import { usePeople } from '@/features/profile/usePeople';
import { colors, spacing } from '@/theme';

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
        <PillButton label="Повторить" onPress={refresh} style={styles.retry} />
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PersonRow person={item} onPress={openPerson} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <AppText variant="body" style={{ color: colors.muted }}>
            Профили не найдены
          </AppText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    flexGrow: 1,
    backgroundColor: colors.bg,
  },
  separator: { height: spacing.md },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  retry: { paddingHorizontal: spacing.xxl },
});
