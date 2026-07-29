import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { CatalogFilter } from '@/components/CatalogFilter';
import { AppText, PillButton } from '@/components/ui';
import { useCatalogFilter } from '@/components/useCatalogFilter';
import type { ArticleListItem } from '@/features/articles/api';
import { ArticleCard } from '@/features/articles/ArticleCard';
import { useArticles } from '@/features/articles/useArticles';
import { colors, spacing } from '@/theme';

export default function ArticlesScreen() {
  const { articles, loading, refreshing, error, refresh } = useArticles();
  const router = useRouter();

  const { query, setQuery, selectedCategory, setSelectedCategory, categories, filtered } =
    useCatalogFilter({
      items: articles,
      getTitle: (a) => a.Title,
      getCategory: (a) => a.Category,
    });

  const openArticle = useCallback(
    (article: ArticleListItem) => {
      if (article.slug) router.push(`/article/${article.slug}`);
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
      renderItem={({ item }) => <ArticleCard article={item} onPress={openArticle} />}
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
          placeholder="Поиск статей"
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <AppText variant="body" style={{ color: colors.muted }}>
            Статьи не найдены
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
  separator: { height: spacing.lg },
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
