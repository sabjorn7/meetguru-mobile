import { decode } from 'base64-arraybuffer';

import { fetchCoursesByIds, type CourseListItem } from '@/features/courses/api';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

const AVATAR_BUCKET = 'profile';

/** Public web URL of a user's profile (for sharing), mirrors the site route. */
export function publicProfileUrl(userId: string): string {
  return `https://app.meetgu.ru/profile_page?user=${userId}`;
}

/** Profile fields shown/edited on the profile screen. */
export type Profile = Pick<
  Tables<'users'>,
  | 'id'
  | 'email'
  | 'Name'
  | 'Photo'
  | 'Description'
  | 'role'
  | 'username'
  | 'telegram_url'
  | 'whatsapp_url'
  | 'vk_url'
  | 'youtube_url'
  | 'website_url'
  | 'booking_url'
  | 'hide'
>;

const PROFILE_COLUMNS =
  'id,email,Name,Photo,Description,role,username,telegram_url,whatsapp_url,vk_url,youtube_url,website_url,booking_url,hide' as const;

/** Public-profile visibility toggles (users.hide): my = created courses, buy = enrolled. */
export function showCreated(hide: Profile['hide']): boolean {
  return hide?.my !== true;
}
export function showEnrolled(hide: Profile['hide']): boolean {
  return hide?.buy !== true;
}

/** Editable profile fields. */
export type ProfilePatch = Pick<
  Profile,
  | 'Name'
  | 'Description'
  | 'telegram_url'
  | 'whatsapp_url'
  | 'vk_url'
  | 'youtube_url'
  | 'website_url'
  | 'booking_url'
>;

/** A profile in the public people directory. */
export type ProfileListItem = {
  id: string;
  name: string | null;
  photo: string | null;
  role: string | null;
  description: string | null;
};

/** Display label for a role. The site shows the "Ученик" role as "Специалист". */
export function roleLabel(role: string | null): string | null {
  if (!role) return null;
  return role === 'Ученик' ? 'Специалист' : role;
}

/**
 * Public people directory — all users, ordered by name. Matches the web `users`
 * page (which lists everyone; the "Ученик" role is just displayed as "Специалист").
 */
export async function fetchProfiles(): Promise<ProfileListItem[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id,Name,Photo,role,Description')
    .neq('role', 'admin')
    .order('Name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((u) => ({
    id: u.id,
    name: u.Name,
    photo: u.Photo,
    role: roleLabel(u.role),
    description: u.Description,
  }));
}

/** Fetch the current user's profile row (users.id === auth uid). */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** A course in "My courses" with the user's access-expiry date. */
export type MyCourseItem = CourseListItem & { endPeriod: string | null };

/** Courses the user has access to (via user_course), newest enrollment first. */
export async function fetchMyCourses(userId: string): Promise<MyCourseItem[]> {
  const { data, error } = await supabase
    .from('user_course')
    .select('course,end_period')
    .eq('user', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = data ?? [];

  const endByCourse = new Map<string, string | null>();
  for (const row of rows) {
    if (row.course && !endByCourse.has(row.course)) {
      endByCourse.set(row.course, row.end_period ?? null);
    }
  }

  const ids = rows
    .map((row) => row.course)
    .filter((id): id is string => typeof id === 'string');

  const courses = await fetchCoursesByIds(ids);
  return courses.map((c) => ({ ...c, endPeriod: endByCourse.get(c.id) ?? null }));
}

/** Update editable profile fields. */
export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw error;
}

/** Update public-profile visibility toggles (users.hide {my, buy}). */
export async function updateProfileVisibility(
  userId: string,
  hide: { my: boolean; buy: boolean },
): Promise<void> {
  const { error } = await supabase.from('users').update({ hide }).eq('id', userId);
  if (error) throw error;
}

/**
 * Upload a new avatar (from an expo-image-picker base64 asset) to the public
 * `profile` bucket, persist its URL on the user, and return the public URL.
 */
export async function uploadAvatar(
  userId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split('/')[1] || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, decode(base64), { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('users')
    .update({ Photo: publicUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return publicUrl;
}
