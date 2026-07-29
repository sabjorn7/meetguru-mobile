import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import type { ProfileListItem } from '@/features/profile/api';
import { colors, radius, spacing } from '@/theme';

/** A user row for the people directory and subscription lists. */
export function PersonRow({
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

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
});
