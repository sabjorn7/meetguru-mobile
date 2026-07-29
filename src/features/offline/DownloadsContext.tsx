import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  deleteDownload,
  downloadVideo,
  loadIndex,
  type DownloadEntry,
  type DownloadMeta,
} from './downloads';

type DownloadsContextValue = {
  /** Completed downloads, keyed by videoId. */
  downloads: Record<string, DownloadEntry>;
  /** Active download progress (0–1), keyed by videoId. */
  progress: Record<string, number>;
  /** Total bytes of all completed downloads. */
  totalSize: number;
  isDownloaded: (videoId: string) => boolean;
  isDownloading: (videoId: string) => boolean;
  start: (meta: DownloadMeta) => Promise<void>;
  remove: (videoId: string) => Promise<void>;
};

const DownloadsContext = createContext<DownloadsContextValue | undefined>(undefined);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<Record<string, DownloadEntry>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadIndex().then(setDownloads).catch(() => {});
  }, []);

  const start = useCallback(async (meta: DownloadMeta) => {
    setProgress((prev) => ({ ...prev, [meta.videoId]: 0 }));
    try {
      const entry = await downloadVideo(meta, (p) =>
        setProgress((prev) => ({ ...prev, [meta.videoId]: p })),
      );
      setDownloads((prev) => ({ ...prev, [meta.videoId]: entry }));
    } finally {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[meta.videoId];
        return next;
      });
    }
  }, []);

  const remove = useCallback(async (videoId: string) => {
    await deleteDownload(videoId);
    setDownloads((prev) => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
  }, []);

  const value = useMemo<DownloadsContextValue>(() => {
    const totalSize = Object.values(downloads).reduce((sum, e) => sum + (e.size || 0), 0);
    return {
      downloads,
      progress,
      totalSize,
      isDownloaded: (videoId) => downloads[videoId] != null,
      isDownloading: (videoId) => progress[videoId] != null,
      start,
      remove,
    };
  }, [downloads, progress, start, remove]);

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads(): DownloadsContextValue {
  const context = useContext(DownloadsContext);
  if (!context) throw new Error('useDownloads must be used within a DownloadsProvider');
  return context;
}
