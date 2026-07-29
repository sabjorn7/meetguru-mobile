import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDownloads } from '@/features/offline/DownloadsContext';

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
        <Text style={styles.total}>
          {entries.length} видео · {formatSize(totalSize)}
        </Text>
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
            <Ionicons name="videocam" size={22} color="#2563eb" />
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.size}>{formatSize(item.size)}</Text>
            </View>
            <Pressable onPress={() => remove(item.videoId)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Нет скачанных видео</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  total: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  size: {
    fontSize: 13,
    color: '#6b7280',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 50,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
});
