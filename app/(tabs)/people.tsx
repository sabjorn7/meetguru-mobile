import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { CatalogFilter } from '@/components/CatalogFilter';
import { AppText, Card, PillButton } from '@/components/ui';
import { useCatalogFilter } from '@/components/useCatalogFilter';
import type { ProfileListItem } from '@/features/profile/api';
import { usePeople } from '@/features/profile/usePeople';
import { colors, radius, spacing } from '@/theme';

function PersonRow({
  person,
  onPress,
}: {
  person: ProfileListItem;
  onPress: (p: ProfileListItem) => void;
}) {
  return (
    <Pressable onPress={() => onPress(person)} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.row}>
        {person.photo ? (
          <Image source={{ uri: person.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <AppText variant="h2" style={{ color: colors.faint }}>
              {(person.name || '?')[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
        )}
        <View style={styles.body}>
          <AppText variant="subtitle" numberOfLines={1}>
            {person.name || 'Без имени'}
          </AppText>
          {person.role ? (
            <AppText variant="label" style={{ color: colors.primary }}>
              {person.role}
            </AppText>
          ) : null}
          {person.description ? (
            <AppText variant="caption" numberOfLines={2}>
              {person.description}
            </AppText>
          ) : null}
        </View>
      </Card>
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
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2, justifyContent: 'center' },
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
