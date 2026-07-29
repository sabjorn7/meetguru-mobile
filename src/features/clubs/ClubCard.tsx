import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import type { ClubListItem } from './api';

/** Russian plural helper. */
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export function ClubCard({ club, onPress }: { club: ClubListItem; onPress: (c: ClubListItem) => void }) {
  return (
    <Pressable onPress={() => onPress(club)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <Card style={styles.card}>
        {club.cover ? (
          <Image source={{ uri: club.cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <AppText variant="h2" style={{ color: colors.faint }}>
              {(club.title || '?')[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
              {club.title || 'Клуб'}
            </AppText>
            {club.status === 'expired' ? (
              <View style={styles.badge}>
                <AppText variant="label" style={{ color: colors.danger }}>
                  Подписка истекла
                </AppText>
              </View>
            ) : club.status === 'owner' ? (
              <View style={[styles.badge, styles.ownerBadge]}>
                <AppText variant="label" style={{ color: colors.primary }}>
                  Ваш клуб
                </AppText>
              </View>
            ) : null}
          </View>
          {club.shortDescr ? (
            <AppText variant="caption" numberOfLines={2}>
              {club.shortDescr}
            </AppText>
          ) : null}
          <AppText variant="label" style={{ color: colors.muted }}>
            {club.subscriberCount} {plural(club.subscriberCount, 'подписчик', 'подписчика', 'подписчиков')}
            {' · '}
            {club.postCount} {plural(club.postCount, 'запись', 'записи', 'записей')}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  cover: { width: '100%', height: 140, backgroundColor: colors.primarySoft },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    backgroundColor: '#fdecec',
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  ownerBadge: { backgroundColor: colors.primarySoft },
});
