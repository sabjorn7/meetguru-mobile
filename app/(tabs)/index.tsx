import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { CatalogFilter } from '@/components/CatalogFilter';
import { AppText, PillButton, PromoBanner } from '@/components/ui';
import { useCatalogFilter } from '@/components/useCatalogFilter';
import type { CourseListItem } from '@/features/courses/api';
import { CourseCard } from '@/features/courses/CourseCard';
import { useCourses } from '@/features/courses/useCourses';
import { colors, spacing } from '@/theme';

export default function CoursesScreen() {
  const { courses, loading, refreshing, error, refresh } = useCourses();
  const router = useRouter();

  const { query, setQuery, selectedCategory, setSelectedCategory, categories, filtered } =
    useCatalogFilter({
      items: courses,
      getTitle: (c) => c.Title,
      getCategory: (c) => c.Category,
    });

  const openCourse = useCallback(
    (course: CourseListItem) => {
      if (course.slug) router.push(`/course/${course.slug}`);
    },
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
        <AppText variant="body" style={styles.errorText}>
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
      renderItem={({ item }) => <CourseCard course={item} onPress={openCourse} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <PromoBanner
            title="Откройте новые знания"
            subtitle="Курсы от практикующих экспертов"
            icon="rocket"
          />
          <CatalogFilter
            query={query}
            onQuery={setQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            placeholder="Поиск курсов"
          />
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <AppText variant="body" style={styles.emptyText}>
            Курсы не найдены
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
  header: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  separator: {
    height: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
  },
  retry: {
    paddingHorizontal: spacing.xxl,
  },
});
