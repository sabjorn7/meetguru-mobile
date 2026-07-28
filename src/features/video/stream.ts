const PEERTUBE_ORIGIN = process.env.EXPO_PUBLIC_PEERTUBE_URL;

/** Resolved HLS master-playlist URLs, keyed by video_id. */
const cache = new Map<string, string | null>();

/**
 * Resolve a PeerTube video's HLS master playlist (.m3u8) for native playback.
 * Videos are Unlisted, so the playlist is publicly fetchable by UUID (access is
 * gated in the UI by only exposing video ids the user may watch). Returns null
 * when there is no video or the lookup fails; never throws.
 */
export async function resolveHlsUrl(videoId: string | null): Promise<string | null> {
  if (!videoId || !PEERTUBE_ORIGIN) return null;
  if (cache.has(videoId)) return cache.get(videoId) ?? null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `${PEERTUBE_ORIGIN}/api/v1/videos/${encodeURIComponent(videoId)}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);

    if (!res.ok) {
      cache.set(videoId, null);
      return null;
    }

    const video = (await res.json()) as {
      streamingPlaylists?: { playlistUrl?: string }[];
    };
    const url = video.streamingPlaylists?.[0]?.playlistUrl ?? null;
    cache.set(videoId, url);
    return url;
  } catch {
    // Transient failure — don't cache, allow a retry.
    return null;
  }
}
