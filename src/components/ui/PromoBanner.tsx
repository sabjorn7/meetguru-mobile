import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type IoniconName = keyof typeof Ionicons.glyphMap;

type Props = {
  title: string;
  subtitle?: string;
  icon?: IoniconName;
};

/** Soft tinted promo banner with an accent icon (reference "Discover…" card). */
export function PromoBanner({ title, subtitle, icon = 'rocket' }: Props) {
  return (
    <View style={styles.banner}>
      <View style={styles.textCol}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.primaryDark,
  },
  subtitle: {
    color: colors.primary,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
