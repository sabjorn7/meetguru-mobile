// Supabase data helpers for the "Трансляции" (live streams) feature — app port of the
// site's src/_front/streams/streamsApi.js. RLS is off project-wide, so the anon/
// authenticated client reads & writes directly.
//
// MONEY: the buyer-facing PURCHASE flow is deliberately NOT ported into the app. A paid
// stream that the user doesn't own opens the site's tested checkout in a browser instead,
// so no Prodamus/order/shop money code is duplicated here (per the "never touch money
// code" rule). Creating a paid stream still creates its hidden backing `course` (a draft,
// not a payment) so the site's untouched BuyCourse pipeline can grant access on purchase.

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

import { deleteLive } from './peertubeLive';

/** Roles allowed to create a broadcast (same set as the subscriptions feature). */
export const STREAMER_ROLES = ['Спикер', 'Учебное заведение'];

/** The author user row attached to a stream (subset of `users`). */
export type StreamAuthor = {
  id: string;
  Name: string | null;
  Photo: string | null;
  role: string | null;
};

/** A stream row with its author attached. */
export type Stream = Tables<'streams'> & { authorUser: StreamAuthor | null };

export type StreamStatus = 'scheduled' | 'live' | 'ended';

export function canStream(role: string | null | undefined): boolean {
  return !!role && STREAMER_ROLES.includes(role);
}

/** Attach each stream's author user row via one batched lookup. */
async function attachAuthors(rows: Tables<'streams'>[]): Promise<Stream[]> {
  const ids = [...new Set(rows.map((r) => r.author).filter(Boolean))];
  let byId: Record<string, StreamAuthor> = {};
  if (ids.length) {
    const { data: users } = await supabase
      .from('users')
      .select('id,Name,Photo,role')
      .in('id', ids);
    byId = Object.fromEntries((users ?? []).map((u) => [u.id, u as StreamAuthor]));
  }
  return rows.map((r) => ({ ...r, authorUser: byId[r.author] ?? null }));
}

// Public list ordering: live first, then scheduled, then ended; newest first within a group.
const STATUS_ORDER: Record<string, number> = { live: 0, scheduled: 1, ended: 2 };

/** All streams for the public list, with authors, ordered live → scheduled → ended. */
export async function listAllStreams(): Promise<Stream[]> {
  const { data, error } = await supabase.from('streams').select('*');
  if (error) throw new Error(`Не удалось загрузить эфиры: ${error.message}`);
  const rows = await attachAuthors(data ?? []);
  return rows.sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** A single stream (with author) for the detail view. */
export async function getStreamById(id: string): Promise<Stream | null> {
  const { data, error } = await supabase.from('streams').select('*').eq('id', id).limit(1);
  if (error) throw new Error(`Не удалось загрузить эфир: ${error.message}`);
  if (!data?.length) return null;
  const [row] = await attachAuthors(data);
  return row;
}

/** All streams by a given author, newest first (the author's own "Мои эфиры" list). */
export async function listMyStreams(authorId: string): Promise<Stream[]> {
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('author', authorId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Не удалось загрузить эфиры: ${error.message}`);
  return attachAuthors(data ?? []);
}

/** Insert a stream metadata row. `peertube_video_id` = the live video uuid. price 0 = free. */
export async function createStream(input: {
  author: string;
  title: string;
  description?: string;
  price?: number;
  peertube_video_id: string;
  access_months?: number | null;
  backing_course_id?: string | null;
  scheduled_at?: string | null;
}): Promise<Stream | null> {
  const { data, error } = await supabase
    .from('streams')
    .insert({
      author: input.author,
      title: input.title,
      description: input.description ?? '',
      price: input.price ?? 0,
      peertube_video_id: input.peertube_video_id,
      access_months: input.access_months ?? null,
      backing_course_id: input.backing_course_id ?? null,
      scheduled_at: input.scheduled_at ?? null,
    })
    .select('*')
    .limit(1);
  if (error) throw new Error(`Не удалось сохранить эфир: ${error.message}`);
  const rows = await attachAuthors(data ?? []);
  return rows[0] ?? null;
}

/**
 * MONEY-ADJACENT: create the hidden backing `course` for a paid stream. Kept out of the
 * catalog (ModStatus 'Черновик', slug stays null). `owner` credits sales/balance to the
 * author on purchase; `Price` drives the charge; `DurationLong` = months. This writes only
 * a draft course row — no payment is moved here. Returns the new course id.
 */
export async function createBackingCourse(input: {
  owner: string;
  title: string;
  price: number;
  months: number;
}): Promise<string> {
  const { data, error } = await supabase
    .from('course')
    .insert({
      owner: input.owner,
      Title: input.title,
      Price: input.price,
      Free: false,
      DurationLong: input.months,
      Category: 'Трансляции',
      ModStatus: 'Черновик', // NOT 'Опубликовано' → excluded from the catalog
    })
    .select('id')
    .limit(1);
  if (error) throw new Error(`Не удалось создать курс-подложку: ${error.message}`);
  const id = data?.[0]?.id;
  if (!id) throw new Error('Курс-подложка не создан.');
  return id;
}

/** Flip a stream's cached status (author's "я в эфире" / "завершить" actions). */
export async function setStreamStatus(streamId: string, status: StreamStatus): Promise<void> {
  const { error } = await supabase.from('streams').update({ status }).eq('id', streamId);
  if (error) throw new Error(`Не удалось обновить статус: ${error.message}`);
}

/**
 * Delete a FREE stream (author-only): removes its PeerTube live video, then the streams row.
 * Paid streams are refused here — a paid stream is backed by a course that may have buyers.
 */
export async function deleteStream(stream: Stream): Promise<void> {
  if (Number(stream.price) > 0 || stream.backing_course_id) {
    throw new Error('Удаление платных эфиров пока недоступно.');
  }
  if (stream.peertube_video_id) {
    try {
      await deleteLive(stream.peertube_video_id);
    } catch (e) {
      console.warn('[streams] PeerTube video delete failed:', (e as Error).message);
    }
  }
  const { error } = await supabase.from('streams').delete().eq('id', stream.id);
  if (error) throw new Error(`Не удалось удалить эфир: ${error.message}`);
}

// ---------- access gate (NOT money) ----------

/** Air date a paid stream's access window is measured from. */
export function streamAirDate(stream: Pick<Stream, 'scheduled_at' | 'created_at'>): Date {
  return new Date(stream.scheduled_at || stream.created_at);
}

/** When paid access ends: air date + access_months. null for free / no duration. */
export function accessExpiry(stream: Stream): Date | null {
  if (!stream.access_months) return null;
  const e = streamAirDate(stream);
  e.setMonth(e.getMonth() + Number(stream.access_months));
  return e;
}

/** Whether the user has purchased this stream (a user_course row on the backing course). */
export async function hasBoughtStream(stream: Stream, userId: string | null): Promise<boolean> {
  if (!stream.backing_course_id || !userId) return false;
  const { data } = await supabase
    .from('user_course')
    .select('id')
    .eq('course', stream.backing_course_id)
    .eq('user', userId)
    .limit(1);
  return !!data?.length;
}

/** Whether a stream is free (price 0 and no paywall). */
export function isFreeStream(stream: Stream): boolean {
  return Number(stream.price) <= 0 && !stream.backing_course_id;
}

/**
 * Whether `userId` may watch `stream`: free streams are open; the author always can; a paid
 * stream needs a purchase AND the access window still open (air date + access_months).
 */
export async function resolveAccess(stream: Stream, userId: string | null): Promise<boolean> {
  if (isFreeStream(stream)) return true;
  if (userId && stream.author === userId) return true;
  if (!(await hasBoughtStream(stream, userId))) return false;
  const expiry = accessExpiry(stream);
  return !expiry || expiry.getTime() >= Date.now();
}
