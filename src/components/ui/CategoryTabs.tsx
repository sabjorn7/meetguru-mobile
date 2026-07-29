import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

type Props = {
  /** Category labels; `null` = the "Все" (all) option. */
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  allLabel?: string;
};

/** Horizontal underline tabs (All / Design / …). */
export function CategoryTabs({ categories, selected, onSelect, allLabel = 'Все' }: Props) {
  const items: { key: string; label: string; value: string | null }[] = [
    { key: '__all', label: allLabel, value: null },
    ...categories.map((c) => ({ key: c, label: c, value: c })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const active = item.value === selected;
        return (
          <Pressable key={item.key} onPress={() => onSelect(item.value)} style={styles.tab}>
            <AppText variant="subtitle" style={active ? styles.active : styles.inactive}>
              {item.label}
            </AppText>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xl,
    paddingRight: spacing.md,
  },
  tab: {
    alignItems: 'center',
    gap: 6,
  },
  active: {
    color: colors.ink,
  },
  inactive: {
    color: colors.faint,
  },
  underline: {
    height: 3,
    width: 22,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: colors.primary,
  },
});
