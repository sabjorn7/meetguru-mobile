// PeerTube Live integration for the "Трансляции" feature (app port of the site's
// src/_front/streams/peertubeLive.js).
//
// Auth model mirrors the site's video uploader (Variant C): the whole platform
// creates lives through ONE shared PeerTube "system" account whose token is cached in
// the Supabase table `Peertube_System` (single row). We reuse the cached `token` while
// valid (now < next_update) and refresh via `grant_type=refresh_token` otherwise,
// writing the rotated token back — exactly like the site, so the two paths don't fight.
//
// SECURITY: client_id/client_secret below are already publicly exposed in the deployed
// web page data (SECURITY_FINDINGS.md, SF-1); shipping them in the app bundle adds no
// NEW exposure. The real fix is a server-side token exchange (tracked as SF-1). Creating
// a live is a streamer-only action, so this code path is not reachable by most users.

import { supabase } from '@/lib/supabase';

const PEERTUBE = process.env.EXPO_PUBLIC_PEERTUBE_URL ?? 'https://video.meetgu.ru';
const CLIENT_ID = 'rf2ju4r862ak1j05xl4sfrybsnjkh9xp';
const CLIENT_SECRET = 'GTU741v51FpMM6aOawM6E4XOc891UNYx';
const CHANNEL_ID = 5; // the system account's channel (same as the uploader default)

// PeerTube video privacy: 1 public, 2 unlisted, 3 private. Keep the site's
// "unlisted + UI-gated" model (same as course/lesson videos).
const PRIVACY_UNLISTED = 2;
// Live latency mode: 1 default, 2 high-latency, 3 small-latency.
const LATENCY_DEFAULT = 1;

// Video-state ids from PeerTube (viewer/status):
//   1 = published (live is on-air, or a replay is ready), 4 = waiting for live, 5 = live ended.
export const VIDEO_STATE = { PUBLISHED: 1, WAITING_FOR_LIVE: 4, LIVE_ENDED: 5 } as const;
export const PEERTUBE_ORIGIN = PEERTUBE;

export type LiveCredentials = {
  rtmpUrl: string | null;
  rtmpsUrl: string | null;
  streamKey: string | null;
};

export type VideoInfo = {
  stateId: number | null;
  isLive: boolean;
  previewPath: string | null;
  thumbnailPath: string | null;
  hasPlaylist: boolean;
  name: string | null;
};

/** Read the single Peertube_System row. */
async function readSystemRow() {
  const { data, error } = await supabase.from('Peertube_System').select('*').limit(1);
  if (error) throw new Error(`Не удалось прочитать Peertube_System: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error('В Peertube_System нет строки с токеном.');
  return row;
}

/**
 * Get a valid PeerTube access token for the system account.
 * Uses the cached token while valid; refreshes (refresh_token grant) and persists otherwise.
 */
export async function getPeertubeToken(): Promise<string> {
  const row = await readSystemRow();
  const now = new Date();

  if (row.token && row.next_update && now < new Date(row.next_update)) {
    return row.token; // cached and still valid — no refresh, no rotation race
  }

  if (!row.refresh_token) {
    throw new Error(
      'Нет refresh_token в Peertube_System. Откройте один раз страницу загрузки видео на сайте, чтобы обновить токен PeerTube.',
    );
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: row.refresh_token,
  });

  const res = await fetch(`${PEERTUBE}/api/v1/users/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(
      `Не удалось обновить токен PeerTube (${res.status}). Возможно, истёк refresh_token — откройте один раз страницу загрузки видео на сайте.`,
    );
  }

  const tok = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_expires_in?: number;
  };
  const nextUpdate = new Date(now.getTime() + (tok.expires_in - 1800) * 1000).toISOString();
  const nextRefresh = tok.refresh_token_expires_in
    ? new Date(now.getTime() + tok.refresh_token_expires_in * 1000).toISOString()
    : row.next_refresh;

  const { error: upErr } = await supabase
    .from('Peertube_System')
    .update({
      token: tok.access_token,
      refresh_token: tok.refresh_token,
      next_update: nextUpdate,
      next_refresh: nextRefresh,
    })
    .eq('id', row.id);
  // A failed write-back isn't fatal for THIS call (we still have a valid token); warn only.
  if (upErr) console.warn('[streams] Peertube_System write-back failed:', upErr.message);

  return tok.access_token;
}

/** Fetch RTMP url + stream key for a live video (author-only info; needs the system token). */
export async function getLiveCredentials(videoId: string): Promise<LiveCredentials> {
  const token = await getPeertubeToken();
  const res = await fetch(`${PEERTUBE}/api/v1/videos/live/${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Не удалось получить данные эфира из PeerTube (${res.status}).`);
  const j = (await res.json()) as { rtmpUrl?: string; rtmpsUrl?: string; streamKey?: string };
  return { rtmpUrl: j.rtmpUrl ?? null, rtmpsUrl: j.rtmpsUrl ?? null, streamKey: j.streamKey ?? null };
}

/**
 * Create a live video on PeerTube under the system account.
 * Returns { video: { id, uuid, shortUUID }, rtmpUrl, rtmpsUrl, streamKey }.
 */
export async function createLive({
  name,
  description = '',
  saveReplay = true,
}: {
  name: string;
  description?: string;
  saveReplay?: boolean;
}): Promise<{ video: { id: number; uuid: string; shortUUID: string } } & LiveCredentials> {
  const token = await getPeertubeToken();

  const payload: Record<string, unknown> = {
    channelId: CHANNEL_ID,
    name,
    privacy: PRIVACY_UNLISTED,
    saveReplay,
    permanentLive: false,
    latencyMode: LATENCY_DEFAULT,
  };
  if (description) payload.description = description;
  // saveReplay requires replaySettings in PeerTube 6+/7; keep the replay unlisted too.
  if (saveReplay) payload.replaySettings = { privacy: PRIVACY_UNLISTED };

  const res = await fetch(`${PEERTUBE}/api/v1/videos/live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Не удалось создать эфир в PeerTube (${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { video: { id: number; uuid: string; shortUUID: string } };
  const video = json.video;
  const creds = await getLiveCredentials(String(video.id));
  return { video, ...creds };
}

/** Delete a live video from PeerTube (author deleting their own stream). Needs the system token. */
export async function deleteLive(videoId: string): Promise<void> {
  if (!videoId) return;
  const token = await getPeertubeToken();
  const res = await fetch(`${PEERTUBE}/api/v1/videos/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Не удалось удалить видео в PeerTube (${res.status}).`);
  }
}

/**
 * Public video info (no auth — unlisted videos return 200): live state, thumbnail, whether a
 * streaming playlist exists (i.e. the live is actually on-air or a replay is ready).
 * Returns null on any failure so callers can fall back to the cached `streams.status`.
 */
export async function getVideoInfo(videoId: string | null): Promise<VideoInfo | null> {
  if (!videoId) return null;
  try {
    const res = await fetch(`${PEERTUBE}/api/v1/videos/${encodeURIComponent(videoId)}`);
    if (!res.ok) return null;
    const v = (await res.json()) as {
      state?: { id?: number };
      isLive?: boolean;
      previewPath?: string;
      thumbnailPath?: string;
      streamingPlaylists?: unknown[];
      name?: string;
    };
    return {
      stateId: v.state?.id ?? null,
      isLive: !!v.isLive,
      previewPath: v.previewPath || null,
      thumbnailPath: v.thumbnailPath || null,
      hasPlaylist: Array.isArray(v.streamingPlaylists) && v.streamingPlaylists.length > 0,
      name: v.name ?? null,
    };
  } catch {
    return null;
  }
}

/** Prefix a PeerTube-relative asset path (previewPath/thumbnailPath) with the instance origin. */
export function assetUrl(path: string | null): string | null {
  return path ? `${PEERTUBE}${path}` : null;
}
