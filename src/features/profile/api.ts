import { decode } from 'base64-arraybuffer';

import { fetchCoursesByIds, type CourseListItem } from '@/features/courses/api';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

const AVATAR_BUCKET = 'profile';

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
>;

const PROFILE_COLUMNS =
  'id,email,Name,Photo,Description,role,username,telegram_url,whatsapp_url,vk_url,youtube_url,website_url,booking_url' as const;

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

/** Courses the user has access to (via user_course), newest enrollment first. */
export async function fetchMyCourses(userId: string): Promise<CourseListItem[]> {
  const { data, error } = await supabase
    .from('user_course')
    .select('course')
    .eq('user', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const ids = (data ?? [])
    .map((row) => row.course)
    .filter((id): id is string => typeof id === 'string');

  return fetchCoursesByIds(ids);
}

/** Update editable profile fields. */
export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
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
