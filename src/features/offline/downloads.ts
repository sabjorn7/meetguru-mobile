import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { fetchVideoFile } from './api';

const INDEX_KEY = 'offline_downloads_v1';
const DIR = `${FileSystem.documentDirectory}offline/`;

/** A downloaded video tracked in the local index. */
export type DownloadEntry = {
  videoId: string;
  localUri: string;
  size: number;
  title: string;
  courseSlug: string | null;
  createdAt: string;
};

export type DownloadMeta = {
  videoId: string;
  title: string;
  courseSlug?: string | null;
};

type Index = Record<string, DownloadEntry>;

export async function loadIndex(): Promise<Index> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? (JSON.parse(raw) as Index) : {};
}

async function saveIndex(index: Index): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

/** Local file:// URI for a downloaded video, or null if not downloaded / missing. */
export async function getLocalUri(videoId: string): Promise<string | null> {
  const index = await loadIndex();
  const entry = index[videoId];
  if (!entry) return null;
  const info = await FileSystem.getInfoAsync(entry.localUri);
  return info.exists ? entry.localUri : null;
}

/**
 * Download a video's MP4 to local storage, reporting progress (0–1).
 * Persists an index entry on success.
 */
export async function downloadVideo(
  meta: DownloadMeta,
  onProgress?: (progress: number) => void,
): Promise<DownloadEntry> {
  const file = await fetchVideoFile(meta.videoId);
  if (!file) throw new Error('Видео недоступно для скачивания.');

  await ensureDir();
  const target = `${DIR}${meta.videoId}.mp4`;

  const resumable = FileSystem.createDownloadResumable(file.url, target, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) {
      onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    }
  });

  const result = await resumable.downloadAsync();
  if (!result) throw new Error('Загрузка прервана.');

  const entry: DownloadEntry = {
    videoId: meta.videoId,
    localUri: result.uri,
    size: file.size,
    title: meta.title,
    courseSlug: meta.courseSlug ?? null,
    createdAt: new Date().toISOString(),
  };
  const index = await loadIndex();
  index[meta.videoId] = entry;
  await saveIndex(index);
  return entry;
}

/** Delete a downloaded video (file + index entry). */
export async function deleteDownload(videoId: string): Promise<void> {
  const index = await loadIndex();
  const entry = index[videoId];
  if (!entry) return;
  try {
    await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
  } catch {
    // file may already be gone
  }
  delete index[videoId];
  await saveIndex(index);
}
