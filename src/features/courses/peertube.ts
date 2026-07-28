const PEERTUBE_ORIGIN = process.env.EXPO_PUBLIC_PEERTUBE_URL;

/**
 * In-memory cache of resolved thumbnail URLs, keyed by video_id. A course cover
 * is the promo video's PeerTube preview; the filename is a random UUID separate
 * from the video id, so it has to be looked up via the API (mirrors the web app).
 * `null` means "resolved, but no image" so we don't refetch known-empty ids.
 */
const cache = new Map<string, string | null>();

/**
 * Resolve a course cover image URL from its promo video id.
 * Returns null when there is no video, the lookup fails, or it times out —
 * the caller falls back to a placeholder. Never throws.
 */
export async function resolveCourseImage(videoId: string | null): Promise<string | null> {
  if (!videoId || !PEERTUBE_ORIGIN) return null;
  if (cache.has(videoId)) return cache.get(videoId) ?? null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `${PEERTUBE_ORIGIN}/api/v1/videos/${encodeURIComponent(videoId)}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);

    if (!res.ok) {
      cache.set(videoId, null);
      return null;
    }

    const video = (await res.json()) as { previewPath?: string; thumbnailPath?: string };
    const path = video.previewPath || video.thumbnailPath;
    const url = path ? `${PEERTUBE_ORIGIN}${path}` : null;
    cache.set(videoId, url);
    return url;
  } catch {
    // Do not cache transient network/timeout failures — allow a later retry.
    return null;
  }
}
