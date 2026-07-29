import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/lib/errors';

import { fetchVideoFile } from './api';
import { useDownloads } from './DownloadsContext';

const WARN_BYTES = 300 * 1024 * 1024; // warn above ~300 MB

function mb(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} МБ`;
}

type Props = {
  videoId: string;
  title: string;
  courseSlug?: string | null;
};

export function DownloadButton({ videoId, title, courseSlug }: Props) {
  const { isDownloaded, isDownloading, progress, start, remove } = useDownloads();
  const [size, setSize] = useState<number | null>(null);

  const downloaded = isDownloaded(videoId);
  const downloading = isDownloading(videoId);

  // Resolve the file size to show on the button (only when not yet downloaded).
  useEffect(() => {
    let mounted = true;
    if (downloaded) return;
    fetchVideoFile(videoId).then((file) => {
      if (mounted && file) setSize(file.size);
    });
    return () => {
      mounted = false;
    };
  }, [videoId, downloaded]);

  function runDownload() {
    start({ videoId, title, courseSlug }).catch((e) =>
      Alert.alert('Ошибка загрузки', errorMessage(e, 'Не удалось скачать видео.')),
    );
  }

  function onDownloadPress() {
    if (size != null && size > WARN_BYTES) {
      Alert.alert(
        'Большой файл',
        `Видео весит ${mb(size)}. Лучше качать по Wi-Fi. Продолжить?`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Скачать', onPress: runDownload },
        ],
      );
    } else {
      runDownload();
    }
  }

  function onDeletePress() {
    Alert.alert('Удалить загрузку?', title, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove(videoId) },
    ]);
  }

  if (downloaded) {
    return (
      <Pressable onPress={onDeletePress} hitSlop={8} style={styles.control}>
        <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
      </Pressable>
    );
  }

  if (downloading) {
    const pct = Math.round((progress[videoId] ?? 0) * 100);
    return (
      <View style={styles.control}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.pct}>{pct}%</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={onDownloadPress} hitSlop={8} style={styles.control}>
      <Ionicons name="download-outline" size={18} color="#2563eb" />
      {size != null ? <Text style={styles.size}>{mb(size)}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  size: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  pct: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
});
