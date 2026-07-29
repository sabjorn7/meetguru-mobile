import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useDownloads } from '@/features/offline/DownloadsContext';
import { colors, radius, spacing } from '@/theme';

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} МБ`;
}

export default function DownloadsScreen() {
  const { downloads, totalSize, remove } = useDownloads();
  const router = useRouter();
  const entries = Object.values(downloads).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Загрузки' }} />

      {entries.length > 0 ? (
        <AppText variant="caption" style={styles.total}>
          {entries.length} видео · {formatSize(totalSize)}
        </AppText>
      ) : null}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.videoId}
        contentContainerStyle={entries.length === 0 ? styles.empty : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => item.courseSlug && router.push(`/course/${item.courseSlug}`)}
          >
            <View style={styles.videoIcon}>
              <Ionicons name="videocam" size={20} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <AppText variant="bodyMedium" numberOfLines={2} style={{ color: colors.ink }}>
                {item.title}
              </AppText>
              <AppText variant="caption" style={{ color: colors.muted }}>
                {formatSize(item.size)}
              </AppText>
            </View>
            <Pressable onPress={() => remove(item.videoId)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <AppText variant="body" style={{ color: colors.muted }}>
            Нет скачанных видео
          </AppText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  total: {
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: 68,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
