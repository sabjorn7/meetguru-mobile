import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { CategoryTabs } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = {
  query: string;
  onQuery: (value: string) => void;
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  placeholder?: string;
};

export function CatalogFilter({
  query,
  onQuery,
  categories,
  selectedCategory,
  onSelectCategory,
  placeholder = 'Поиск',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {categories.length > 0 ? (
        <CategoryTabs
          categories={categories}
          selected={selectedCategory}
          onSelect={onSelectCategory}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
});
