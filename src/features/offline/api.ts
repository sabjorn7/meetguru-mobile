const PEERTUBE_ORIGIN = process.env.EXPO_PUBLIC_PEERTUBE_URL;

/** The single downloadable (fragmented MP4) file backing a PeerTube video. */
export type VideoFile = {
  url: string;
  size: number;
  resolution: string | null;
};

/**
 * Resolve a video's downloadable MP4 (from the HLS playlist's per-resolution
 * fragmented file). Each video exposes exactly one file; returns null if there
 * is no video or the lookup fails.
 */
export async function fetchVideoFile(videoId: string | null): Promise<VideoFile | null> {
  if (!videoId || !PEERTUBE_ORIGIN) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `${PEERTUBE_ORIGIN}/api/v1/videos/${encodeURIComponent(videoId)}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;

    const video = (await res.json()) as {
      streamingPlaylists?: {
        files?: { fileUrl?: string; size?: number; resolution?: { label?: string } }[];
      }[];
    };
    const file = video.streamingPlaylists?.[0]?.files?.[0];
    if (!file?.fileUrl) return null;
    return {
      url: file.fileUrl,
      size: file.size ?? 0,
      resolution: file.resolution?.label ?? null,
    };
  } catch {
    return null;
  }
}
